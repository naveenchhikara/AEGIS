# AEGIS Deployment & Operations Guide

**Version:** 1.0  
**Last Updated:** 2026-02-17  
**Region:** ap-south-1 (Mumbai) — RBI Data Localization Compliance

---

## Table of Contents

1. [AWS SES Setup](#1-aws-ses-setup)
2. [Coolify Deployment](#2-coolify-deployment)
3. [GitHub Branch Protection](#3-github-branch-protection)
4. [Production Checklist](#4-production-checklist)
5. [Database Operations](#5-database-operations)
6. [Monitoring & Alerting](#6-monitoring--alerting)

---

## 1. AWS SES Setup

### 1.1 Prerequisites

- AWS account with IAM access
- Domain ownership (e.g., `aegis.in`)
- Access to domain DNS management console

### 1.2 Create SES Identity

```bash
# Region: ap-south-1 (Mumbai) — RBI data localization requirement
aws ses create-email-identity \
  --email-identity aegis.in \
  --region ap-south-1

# Verify the identity creation
aws ses get-email-identity \
  --email-identity aegis.in \
  --region ap-south-1
```

**Console Method:**
1. Navigate to: https://ap-south-1.console.aws.amazon.com/ses/home?region=ap-south-1#/verified-identities
2. Click **Create identity**
3. Select **Domain**
4. Enter domain: `aegis.in`
5. Enable **DKIM signing** (Easy DKIM with 2048-bit key)
6. Click **Create identity**

### 1.3 Configure DNS Records

After creating the identity, AWS SES will provide 3 CNAME records. You must add ALL of them to your DNS:

#### DKIM Records (3 CNAMEs)

SES will provide records similar to:

```
Name: abcdefgh12345._domainkey.aegis.in
Type: CNAME
Value: abcdefgh12345.dkim.amazonses.com

Name: ijklmnop67890._domainkey.aegis.in
Type: CNAME
Value: ijklmnop67890.dkim.amazonses.com

Name: qrstuvwx54321._domainkey.aegis.in
Type: CNAME
Value: qrstuvwx54321.dkim.amazonses.com
```

**Action Required:**
1. Copy the exact values from the SES console
2. Add all 3 CNAME records to your DNS provider
3. Wait 5-10 minutes for DNS propagation

#### Verify DNS Propagation

```bash
# Check DKIM record (replace with your actual record name)
dig +short abcdefgh12345._domainkey.aegis.in CNAME

# Should return: abcdefgh12345.dkim.amazonses.com
```

#### SPF Record (TXT)

Add to your domain's root:

```
Name: aegis.in
Type: TXT
Value: "v=spf1 include:amazonses.com ~all"
```

If you already have an SPF record, merge it:

```
"v=spf1 include:amazonses.com include:your-other-provider.com ~all"
```

#### DMARC Record (TXT)

Add for email authentication reporting:

```
Name: _dmarc.aegis.in
Type: TXT
Value: "v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@aegis.in; pct=100; adkim=s; aspf=s"
```

**Explanation:**
- `p=quarantine` — Suspicious emails go to spam (use `p=reject` after testing)
- `rua=` — Aggregate reports sent here
- `pct=100` — Apply policy to 100% of emails
- `adkim=s` — Strict DKIM alignment
- `aspf=s` — Strict SPF alignment

### 1.4 Verify Domain Status

```bash
# Check identity verification status
aws ses get-email-identity \
  --email-identity aegis.in \
  --region ap-south-1 \
  --query 'VerificationStatus' \
  --output text

# Expected output after DNS propagation (5-72 hours): SUCCESS
```

**Console Method:**
1. Go to SES Console → Verified Identities
2. Click on `aegis.in`
3. Check **Identity status**: Should show "Verified" with green checkmark
4. Check **DKIM status**: Should show "Successful"

### 1.5 Request Production Access

**SES starts in Sandbox Mode** — you can only send to verified email addresses.

To send to any email address (production):

1. Navigate to: https://ap-south-1.console.aws.amazon.com/ses/home?region=ap-south-1#/account
2. Click **Request production access**
3. Fill out the form:
   - **Mail type:** Transactional
   - **Website URL:** https://aegis.in
   - **Use case description:**
     ```
     AEGIS is an internal audit management platform for Urban Cooperative Banks (UCBs)
     in India. We send transactional emails for:
     - User invitations and password resets
     - Audit engagement notifications
     - Observation status updates
     - Compliance action reminders
     
     Expected volume: 500-1000 emails/day
     Opt-out mechanism: Unsubscribe link in all emails
     Bounce/complaint handling: Automated via SES notifications
     ```
   - **Additional contacts:** (Your email)
4. Submit request
5. **Response time:** Usually 24-48 hours

### 1.6 Create IAM User for SES

```bash
# Create IAM user
aws iam create-user --user-name aegis-ses

# Attach SES sending policy
aws iam attach-user-policy \
  --user-name aegis-ses \
  --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess

# Create access key
aws iam create-access-key --user-name aegis-ses

# Save the AccessKeyId and SecretAccessKey — you'll need these for .env
```

**Minimal Permissions Policy** (recommended over `AmazonSESFullAccess`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail",
        "ses:SendTemplatedEmail"
      ],
      "Resource": "arn:aws:ses:ap-south-1:YOUR_ACCOUNT_ID:identity/aegis.in"
    }
  ]
}
```

### 1.7 Test Email Sending

```bash
# Test email (replace with verified email in sandbox mode)
aws ses send-email \
  --from "noreply@aegis.in" \
  --to "your-test-email@example.com" \
  --subject "AEGIS SES Test" \
  --text "This is a test email from AEGIS SES setup." \
  --region ap-south-1

# Expected output: MessageId (UUID)
```

**Application Test:**

Add to `.env`:

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
SES_FROM_EMAIL=noreply@aegis.in
```

Test email sending:

```bash
# From AEGIS root directory
pnpm dev

# In another terminal, trigger a password reset or invitation
# Check your email inbox for the test message
```

### 1.8 Configure Bounce & Complaint Handling

**SNS Topic for Notifications:**

```bash
# Create SNS topic for bounces
aws sns create-topic \
  --name aegis-ses-bounces \
  --region ap-south-1

# Create SNS topic for complaints
aws sns create-topic \
  --name aegis-ses-complaints \
  --region ap-south-1

# Subscribe your monitoring email
aws sns subscribe \
  --topic-arn arn:aws:sns:ap-south-1:ACCOUNT_ID:aegis-ses-bounces \
  --protocol email \
  --notification-endpoint alerts@aegis.in \
  --region ap-south-1

# Repeat for complaints topic
```

**Configure SES to publish to SNS:**

```bash
# Set bounce notification
aws ses put-identity-notification-attributes \
  --identity aegis.in \
  --notification-type Bounce \
  --sns-topic arn:aws:sns:ap-south-1:ACCOUNT_ID:aegis-ses-bounces \
  --region ap-south-1

# Set complaint notification
aws ses put-identity-notification-attributes \
  --identity aegis.in \
  --notification-type Complaint \
  --sns-topic arn:aws:sns:ap-south-1:ACCOUNT_ID:aegis-ses-complaints \
  --region ap-south-1
```

### 1.9 SES Checklist

- [ ] Domain identity created in ap-south-1
- [ ] 3 DKIM CNAME records added to DNS
- [ ] SPF TXT record added
- [ ] DMARC TXT record added
- [ ] DNS propagation verified (dig/nslookup)
- [ ] Identity status: Verified (green checkmark)
- [ ] DKIM status: Successful
- [ ] Production access requested (for non-sandbox)
- [ ] IAM user created with SES permissions
- [ ] Access keys stored in password manager
- [ ] Test email sent successfully
- [ ] Bounce/complaint SNS topics configured
- [ ] Monitoring email subscribed to SNS topics

---

## 2. Coolify Deployment

### 2.1 Infrastructure Provisioning

**Option A: AWS CDK (Recommended)**

```bash
# From AEGIS/infra directory
cd infra

# Install dependencies
npm install

# Bootstrap CDK (first time only)
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/ap-south-1

# Deploy infrastructure
npx cdk deploy \
  -c keyPairName=aegis-prod \
  -c sshCidr=YOUR_IP/32

# Save outputs:
# - InstanceId: i-0abc123...
# - PublicIP: 13.232.xxx.xxx
# - EvidenceBucketName: aegis-evidence-123456789
# - CoolifyDashboard: http://13.232.xxx.xxx:8000
# - SSHCommand: ssh -i aegis-prod.pem ec2-user@13.232.xxx.xxx
```

**What CDK Creates:**
- EC2 t3.small instance (2 vCPU, 2 GB RAM)
- 30 GB GP3 EBS volume (encrypted)
- Elastic IP (static, free when attached)
- S3 bucket for evidence storage (versioned, encrypted)
- Security group (ports 22, 80, 443, 8000)
- IAM role with SSM and S3 permissions
- User data script to install Coolify

**Option B: Manual EC2 Setup**

1. Launch EC2 instance:
   - AMI: Amazon Linux 2023 (64-bit x86)
   - Instance type: t3.small
   - Region: ap-south-1 (Mumbai)
   - Storage: 30 GB GP3
   - Security group:
     - SSH (22) from your IP
     - HTTP (80) from 0.0.0.0/0
     - HTTPS (443) from 0.0.0.0/0
     - Coolify (8000) from your IP

2. Attach Elastic IP

3. SSH into instance:
   ```bash
   ssh -i aegis-prod.pem ec2-user@YOUR_ELASTIC_IP
   ```

4. Install Coolify:
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```

### 2.2 Coolify Initial Setup

**Access Coolify Dashboard:**

```
http://YOUR_ELASTIC_IP:8000
```

**First-Time Setup:**

1. **Create root user**:
   - Email: `admin@aegis.in`
   - Password: (Generate strong password, store in password manager)

2. **Add GitHub integration**:
   - Settings → Sources → Add Source
   - Type: GitHub App
   - Follow OAuth flow to authorize Coolify
   - Select repository: `your-org/aegis`

3. **Configure server**:
   - Settings → Servers → Localhost
   - Click **Validate & configure**
   - Wait for Docker installation to complete

### 2.3 Create Application in Coolify

**New Project:**

1. **Projects → New Project**
   - Name: `AEGIS Production`
   - Description: `Internal Audit Management Platform`

2. **Add Resource → New Application**
   - Source: GitHub App
   - Repository: `your-org/aegis`
   - Branch: `main`
   - Build pack: Dockerfile
   - Port: 3000

**Build Configuration:**

1. **Build Settings**:
   - Build command: (leave empty — Dockerfile handles it)
   - Base directory: `/`
   - Dockerfile location: `./Dockerfile`
   - Docker Compose: Use `docker-compose.yml`

2. **Environment Variables** (see Section 4.1 for full list):

   Click **Add Variable** for each:

   ```env
   # Database
   POSTGRES_USER=aegis
   POSTGRES_PASSWORD=<generate-strong-password>
   POSTGRES_DB=aegis
   POSTGRES_PORT=5433

   # Auth
   BETTER_AUTH_SECRET=<openssl-rand-base64-32>
   BETTER_AUTH_URL=https://aegis.in

   # AWS
   AWS_REGION=ap-south-1
   AWS_ACCESS_KEY_ID=<from-ses-setup>
   AWS_SECRET_ACCESS_KEY=<from-ses-setup>
   S3_BUCKET_NAME=<from-cdk-output>
   SES_FROM_EMAIL=noreply@aegis.in

   # App
   NODE_ENV=production
   NEXT_PUBLIC_APP_URL=https://aegis.in
   DATABASE_URL=postgresql://aegis:<password>@postgres:5432/aegis
   ```

   **Important:**
   - Use **Secret** toggle for sensitive values
   - Do NOT use `SKIP_ENV_VALIDATION=1` in production

3. **Storage (Persistent Volume for PostgreSQL)**:
   - Coolify auto-creates `postgres_data` volume
   - Verify in: Application → Storage tab
   - Path: `/var/lib/postgresql/data` (from docker-compose.yml)

### 2.4 Database Initialization

**After first deployment:**

```bash
# SSH into Coolify server
ssh -i aegis-prod.pem ec2-user@YOUR_ELASTIC_IP

# Find the app container
docker ps | grep aegis

# Access the app container
docker exec -it <container-id> sh

# Run Prisma migrations
npx prisma migrate deploy

# Seed the database
npx prisma db seed

# Exit container
exit
```

**Or use Coolify's Execute Command feature:**

1. Application → Execute Command
2. Container: `aegis-app`
3. Command:
   ```bash
   npx prisma migrate deploy && npx prisma db seed
   ```

### 2.5 Domain & SSL Configuration

**Configure Domain:**

1. **DNS Setup**:
   - Add A record: `aegis.in` → `YOUR_ELASTIC_IP`
   - Add A record: `www.aegis.in` → `YOUR_ELASTIC_IP`

2. **Coolify Domain Settings**:
   - Application → Domains
   - Click **Add Domain**
   - Enter: `aegis.in`
   - Enable **Auto-generate SSL certificate** (Let's Encrypt)
   - Click **Save**

3. **Wait for SSL provisioning** (1-2 minutes)
   - Status should change to: ✅ SSL Active

4. **Update Environment Variables**:
   ```env
   BETTER_AUTH_URL=https://aegis.in
   NEXT_PUBLIC_APP_URL=https://aegis.in
   ```

5. **Redeploy** to pick up new env vars

### 2.6 GitHub Webhook Setup

**Generate Coolify Webhook URL:**

1. Coolify → Application → Webhooks
2. Click **Generate Webhook URL**
3. Copy the URL (looks like):
   ```
   https://YOUR_ELASTIC_IP/api/v1/deploy/webhook/abc123def456
   ```

**Add to GitHub Secrets:**

```bash
# Navigate to GitHub repository
# Settings → Secrets and variables → Actions → New repository secret

# Add two secrets:
Name: COOLIFY_WEBHOOK_URL
Value: <paste-webhook-url>

Name: COOLIFY_API_TOKEN
Value: <leave-empty-or-use-bearer-token-if-required>
```

**Test the workflow:**

```bash
# Make a small change to trigger CI
git commit --allow-empty -m "test: trigger CI/CD pipeline"
git push origin main

# Watch GitHub Actions: https://github.com/your-org/aegis/actions
# After all jobs pass, Coolify should auto-deploy
```

### 2.7 Deployment Verification

**Health Checks:**

```bash
# API health endpoint
curl https://aegis.in/api/health

# Expected: {"status":"ok","database":"connected","timestamp":"2026-02-17T..."}

# Homepage
curl -I https://aegis.in

# Expected: HTTP/2 200
```

**Coolify Logs:**

1. Application → Logs
2. Filter by:
   - Build logs (check for errors)
   - Application logs (runtime errors)
   - Database logs (connection issues)

**Docker Container Status:**

```bash
# SSH into server
ssh -i aegis-prod.pem ec2-user@YOUR_ELASTIC_IP

# Check containers
docker ps

# Should show:
# - aegis-app (healthy)
# - aegis-postgres (healthy)

# Check app logs
docker logs aegis-app --tail 50

# Check database logs
docker logs aegis-postgres --tail 50
```

### 2.8 Coolify Checklist

- [ ] EC2 instance provisioned (t3.small, ap-south-1)
- [ ] Elastic IP attached and noted
- [ ] Coolify installed and accessible on :8000
- [ ] GitHub integration configured
- [ ] Application created and linked to repo
- [ ] Environment variables set (all required vars)
- [ ] PostgreSQL volume persistent
- [ ] Prisma migrations run
- [ ] Database seeded with master data
- [ ] Domain DNS configured (A record)
- [ ] SSL certificate provisioned (Let's Encrypt)
- [ ] HTTPS working (https://aegis.in)
- [ ] GitHub secrets added (COOLIFY_WEBHOOK_URL)
- [ ] CI/CD pipeline tested (deploy job succeeds)
- [ ] Health check endpoint returns 200 OK
- [ ] Application accessible and functional

---

## 3. GitHub Branch Protection

### 3.1 Required Status Checks

Based on `.github/workflows/ci.yml`, configure these checks:

**Navigate to:**
```
https://github.com/your-org/aegis/settings/branches
```

**Add rule for `main` branch:**

### 3.2 Branch Protection Configuration

Click **Add rule** and configure:

#### Basic Settings

- **Branch name pattern:** `main`
- **Require a pull request before merging:** ✅
  - **Require approvals:** 1
  - **Dismiss stale pull request approvals when new commits are pushed:** ✅
  - **Require review from Code Owners:** ❌ (unless you create CODEOWNERS file)
  - **Require approval of the most recent reviewable push:** ✅

#### Status Checks

- **Require status checks to pass before merging:** ✅
- **Require branches to be up to date before merging:** ✅

**Required status checks** (must all pass):
```
lint
typecheck
build
e2e
```

**Note:** Do NOT require `deploy` as a status check — it only runs on `main` push, not PRs.

#### Additional Protections

- **Require conversation resolution before merging:** ✅
- **Require signed commits:** ❌ (optional, enable if your team uses GPG)
- **Require linear history:** ✅ (prevents merge commits, enforces rebase)
- **Require deployments to succeed before merging:** ❌
- **Lock branch:** ❌
- **Do not allow bypassing the above settings:** ✅
- **Restrict who can push to matching branches:** ❌ (or specify admins only)
- **Allow force pushes:** ❌
- **Allow deletions:** ❌

### 3.3 Additional Branch Rules

**Create rule for `develop` branch** (if using GitFlow):

- **Branch name pattern:** `develop`
- **Require a pull request before merging:** ✅
  - **Require approvals:** 1
- **Require status checks to pass before merging:** ✅
  - Required checks: `lint`, `typecheck`, `build`, `e2e`

**Create rule for release branches:**

- **Branch name pattern:** `release/*`
- **Require a pull request before merging:** ✅
  - **Require approvals:** 1
- **Require status checks to pass before merging:** ✅

### 3.4 Tag Protection (Optional)

**Protect version tags:**

```
https://github.com/your-org/aegis/settings/tag_protection
```

Add pattern: `v*.*.*` (e.g., v1.0.0, v2.1.3)

### 3.5 Verify Configuration

**Test the protection:**

1. Create a test branch:
   ```bash
   git checkout -b test/branch-protection
   git commit --allow-empty -m "test: verify branch protection"
   git push origin test/branch-protection
   ```

2. Open PR: https://github.com/your-org/aegis/compare/test/branch-protection

3. **Expected behavior:**
   - Cannot merge until CI passes
   - All 4 status checks appear (lint, typecheck, build, e2e)
   - "Merge" button disabled until checks pass
   - After checks pass, "Merge" button requires 1 approval
   - Cannot push directly to `main` (branch is protected)

4. **Try direct push (should fail):**
   ```bash
   git checkout main
   git commit --allow-empty -m "test: direct push should fail"
   git push origin main

   # Expected error:
   # remote: error: GH006: Protected branch update failed for refs/heads/main.
   ```

### 3.6 Branch Protection Checklist

- [ ] Branch protection rule created for `main`
- [ ] Require pull request before merging enabled
- [ ] Require 1 approval
- [ ] Dismiss stale reviews on push enabled
- [ ] Required status checks: lint, typecheck, build, e2e
- [ ] Require branches up to date before merge
- [ ] Require conversation resolution
- [ ] Require linear history (no merge commits)
- [ ] No bypass allowed
- [ ] Force push disabled
- [ ] Branch deletion disabled
- [ ] Protection tested with dummy PR
- [ ] Direct push to main blocked and verified

---

## 4. Production Checklist

### 4.1 Environment Variables

**Complete `.env` for production:**

```env
# =============================================================================
# AEGIS Production Environment
# =============================================================================

# -----------------------------------------------------------------------------
# Database (PostgreSQL 16)
# -----------------------------------------------------------------------------
POSTGRES_USER=aegis
POSTGRES_PASSWORD=<generate-with-pwgen-32>
POSTGRES_DB=aegis
POSTGRES_PORT=5433

# Connection string
# In Docker Compose: host=postgres (service name), port=5432 (internal)
DATABASE_URL=postgresql://aegis:<password>@postgres:5432/aegis

# -----------------------------------------------------------------------------
# Authentication (Better Auth)
# -----------------------------------------------------------------------------
# Generate with: openssl rand -base64 32
BETTER_AUTH_SECRET=<openssl-rand-base64-32>
BETTER_AUTH_URL=https://aegis.in

# -----------------------------------------------------------------------------
# AWS S3 Evidence Storage
# -----------------------------------------------------------------------------
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=<from-iam-user-with-s3-write>
AWS_SECRET_ACCESS_KEY=<from-iam-user>
S3_BUCKET_NAME=<from-cdk-output-or-manual-creation>

# -----------------------------------------------------------------------------
# AWS SES Email
# -----------------------------------------------------------------------------
AWS_SES_REGION=ap-south-1
SES_FROM_EMAIL=noreply@aegis.in

# -----------------------------------------------------------------------------
# Application
# -----------------------------------------------------------------------------
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://aegis.in
NEXT_TELEMETRY_DISABLED=1

# -----------------------------------------------------------------------------
# Build Configuration
# -----------------------------------------------------------------------------
# DO NOT SET IN PRODUCTION — env validation must run
# SKIP_ENV_VALIDATION=
```

**Security Rules:**

1. **Never commit `.env` to git** (already in `.gitignore`)
2. **Rotate secrets every 90 days** (BETTER_AUTH_SECRET, DB password, AWS keys)
3. **Use different values for dev/staging/prod**
4. **Store in password manager** (1Password, Bitwarden, AWS Secrets Manager)

### 4.2 Security Headers

**Already configured in `nginx-aegis.conf`:**

```nginx
# Security Headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
```

**Additional headers to add** (edit `/etc/nginx/sites-available/aegis`):

```nginx
# Add inside the server block:

# Strict Transport Security (HSTS) — ONLY after SSL is working
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Content Security Policy (CSP)
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://aegis-evidence-*.s3.ap-south-1.amazonaws.com; frame-ancestors 'self';" always;

# Permissions Policy (formerly Feature-Policy)
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
```

**Reload Nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

**Verify headers:**

```bash
curl -I https://aegis.in | grep -E "X-Frame|X-Content|X-XSS|Strict-Transport|Content-Security"
```

### 4.3 SSL/TLS Configuration

**Let's Encrypt via Coolify** (automatic):

- Coolify handles SSL certificate provisioning
- Certificates auto-renew every 60 days
- No manual intervention required

**Verify SSL:**

```bash
# Check certificate validity
openssl s_client -connect aegis.in:443 -servername aegis.in < /dev/null 2>/dev/null | openssl x509 -noout -dates

# Check SSL rating
https://www.ssllabs.com/ssltest/analyze.html?d=aegis.in
```

**Target SSL Labs Grade:** A or A+

### 4.4 Firewall Configuration

**UFW (Uncomplicated Firewall) on EC2:**

```bash
# SSH into server
ssh -i aegis-prod.pem ec2-user@YOUR_ELASTIC_IP

# Check UFW status
sudo ufw status

# If not enabled, configure:
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8000/tcp  # Coolify (restrict to your IP if possible)

# Enable firewall
sudo ufw enable

# Verify
sudo ufw status numbered
```

**AWS Security Group** (already configured by CDK):

- SSH (22): Your IP only
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- Coolify (8000): Your IP only (update in AWS Console)

### 4.5 Rate Limiting

**Nginx rate limiting** (edit `/etc/nginx/sites-available/aegis`):

```nginx
# Add at the top of the file (before server block):
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=general_limit:10m rate=30r/s;

# Inside server block, add:

# API rate limiting
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    limit_req_status 429;
    
    # ... existing proxy_pass config
}

# General rate limiting
location / {
    limit_req zone=general_limit burst=50 nodelay;
    limit_req_status 429;
    
    # ... existing proxy_pass config
}
```

**Reload Nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### 4.6 Backup Strategy

**Database Backups** (see Section 5.2)

**S3 Bucket Versioning** (already enabled):

```bash
# Verify versioning
aws s3api get-bucket-versioning \
  --bucket aegis-evidence-123456789 \
  --region ap-south-1

# Expected: "Status": "Enabled"
```

**Application Code:**

- Primary: Git repository (GitHub)
- Backup: Clone to S3 every week

**Coolify Configuration Backup:**

```bash
# Export Coolify database
docker exec coolify pg_dump -U coolify coolify > /tmp/coolify-backup.sql

# Upload to S3
aws s3 cp /tmp/coolify-backup.sql \
  s3://aegis-evidence-123456789/backups/coolify/$(date +%Y-%m-%d).sql \
  --region ap-south-1
```

### 4.7 Logging

**Application Logs** (via PM2):

```bash
# View logs
docker exec aegis-app pm2 logs --lines 100

# Log files location (if using host-mounted volume)
/home/ubuntu/aegis/logs/out.log
/home/ubuntu/aegis/logs/error.log
```

**Nginx Logs:**

```bash
# Access log
sudo tail -f /var/log/nginx/access.log

# Error log
sudo tail -f /var/log/nginx/error.log
```

**Docker Logs:**

```bash
# Application container
docker logs aegis-app --tail 100 --follow

# PostgreSQL container
docker logs aegis-postgres --tail 100 --follow
```

**Log Rotation** (Nginx — already configured):

```bash
# Check logrotate config
cat /etc/logrotate.d/nginx

# Manual rotation test
sudo logrotate -f /etc/logrotate.d/nginx
```

### 4.8 Production Checklist (Summary)

**Pre-Deployment:**

- [ ] All environment variables set and validated
- [ ] BETTER_AUTH_SECRET generated (32+ chars)
- [ ] Database password strong (32+ chars)
- [ ] AWS credentials for SES user only (least privilege)
- [ ] S3 bucket name from CDK output
- [ ] Domain DNS configured (A record to Elastic IP)
- [ ] SSL certificate provisioned (Let's Encrypt via Coolify)
- [ ] All secrets stored in password manager

**Security:**

- [ ] Nginx security headers configured
- [ ] CSP policy added
- [ ] HSTS enabled (after SSL working)
- [ ] SSL Labs rating: A or A+
- [ ] UFW firewall enabled
- [ ] AWS Security Group restricted (SSH to your IP)
- [ ] Rate limiting configured (API and general)
- [ ] No secrets in git history (scan with `git secrets`)

**Infrastructure:**

- [ ] EC2 instance: t3.small, ap-south-1
- [ ] Elastic IP attached
- [ ] EBS volume encrypted
- [ ] S3 bucket versioned and encrypted
- [ ] IAM roles follow least privilege
- [ ] Coolify installed and accessible
- [ ] PostgreSQL data volume persistent

**Monitoring:**

- [ ] Health check endpoint returns 200 OK
- [ ] Application logs accessible
- [ ] Nginx logs accessible
- [ ] Docker container health checks passing
- [ ] Uptime monitoring configured (see Section 6)
- [ ] Error alerting configured (see Section 6)

**Backups:**

- [ ] Database backup cron configured (see Section 5.2)
- [ ] S3 versioning enabled
- [ ] Backup restoration tested at least once

**Documentation:**

- [ ] Deployment runbook created
- [ ] Secrets documented in password manager
- [ ] DNS records documented
- [ ] Team access to Coolify dashboard
- [ ] On-call contact list

---

## 5. Database Operations

### 5.1 Migrations

**Development:**

```bash
# Create a new migration
pnpm prisma migrate dev --name add_new_field

# This will:
# 1. Generate SQL migration file in prisma/migrations/
# 2. Apply migration to dev database
# 3. Regenerate Prisma Client
```

**Production:**

```bash
# SSH into Coolify server
ssh -i aegis-prod.pem ec2-user@YOUR_ELASTIC_IP

# Access app container
docker exec -it aegis-app sh

# Apply pending migrations (non-interactive)
npx prisma migrate deploy

# Verify migration status
npx prisma migrate status

# Expected: "Database schema is up to date!"
```

**Rollback a Migration:**

Prisma doesn't support automatic rollback. Manual process:

```bash
# 1. Identify the migration to rollback
npx prisma migrate status

# 2. Find the migration SQL file
# prisma/migrations/20260215123456_migration_name/migration.sql

# 3. Write a DOWN migration (manual)
# Create: prisma/migrations/20260217_rollback/migration.sql

# 4. Apply manually
docker exec -it aegis-postgres psql -U aegis -d aegis -f /path/to/rollback.sql

# 5. Update migration history
docker exec -it aegis-postgres psql -U aegis -d aegis -c \
  "DELETE FROM _prisma_migrations WHERE migration_name = '20260215123456_migration_name';"
```

**Best Practice:**

- **Test migrations in staging first**
- **Backup database before production migration**
- **Plan rollback steps before deploying**

### 5.2 Backup Strategy

#### Automated Daily Backups

**Create backup script** (`/home/ubuntu/aegis/scripts/backup-db.sh`):

```bash
#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/home/ubuntu/aegis/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
S3_BUCKET="aegis-evidence-123456789"  # Replace with your bucket
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Dump database
docker exec aegis-postgres pg_dump -U aegis -d aegis | gzip > "$BACKUP_DIR/aegis-$TIMESTAMP.sql.gz"

# Upload to S3
aws s3 cp "$BACKUP_DIR/aegis-$TIMESTAMP.sql.gz" \
  "s3://$S3_BUCKET/backups/database/aegis-$TIMESTAMP.sql.gz" \
  --region ap-south-1

# Cleanup old local backups
find "$BACKUP_DIR" -name "aegis-*.sql.gz" -mtime +7 -delete

echo "Backup completed: aegis-$TIMESTAMP.sql.gz"
echo "Uploaded to: s3://$S3_BUCKET/backups/database/"
```

**Make executable:**

```bash
chmod +x /home/ubuntu/aegis/scripts/backup-db.sh
```

**Add to crontab:**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM IST (20:30 UTC previous day)
30 20 * * * /home/ubuntu/aegis/scripts/backup-db.sh >> /home/ubuntu/aegis/logs/backup.log 2>&1
```

**Test the backup:**

```bash
# Run manually
/home/ubuntu/aegis/scripts/backup-db.sh

# Check S3
aws s3 ls s3://aegis-evidence-123456789/backups/database/ --region ap-south-1
```

#### S3 Lifecycle Policy (Already configured in CDK)

```json
{
  "Rules": [
    {
      "Id": "backup-lifecycle",
      "Prefix": "backups/",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ],
      "Expiration": {
        "Days": 90
      }
    }
  ]
}
```

**What this does:**

- Day 0-30: S3 Standard (instant access)
- Day 30-90: S3 Glacier (retrieval takes hours, cheaper)
- Day 90+: Deleted (adjust based on compliance requirements)

### 5.3 Backup Restoration

**Restore from local backup:**

```bash
# Stop the application
docker stop aegis-app

# Drop existing database (CAUTION!)
docker exec aegis-postgres psql -U aegis -d postgres -c "DROP DATABASE IF EXISTS aegis;"
docker exec aegis-postgres psql -U aegis -d postgres -c "CREATE DATABASE aegis OWNER aegis;"

# Restore from backup
gunzip -c /home/ubuntu/aegis/backups/aegis-2026-02-17_02-30-00.sql.gz | \
  docker exec -i aegis-postgres psql -U aegis -d aegis

# Restart application
docker start aegis-app

# Verify data
docker exec aegis-app npx prisma db pull
```

**Restore from S3:**

```bash
# Download backup
aws s3 cp \
  s3://aegis-evidence-123456789/backups/database/aegis-2026-02-17_02-30-00.sql.gz \
  /home/ubuntu/aegis/backups/ \
  --region ap-south-1

# Then follow local restore steps above
```

### 5.4 RLS Verification

**What is RLS?**

Row-Level Security ensures multi-tenant data isolation at the database level. Each tenant can only see their own data.

**Check RLS policies:**

```sql
-- Access PostgreSQL
docker exec -it aegis-postgres psql -U aegis -d aegis

-- List all RLS policies
SELECT schemaname, tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Expected output:
-- tenant | tenant_isolation | ALL | (id = current_setting('app.tenant_id'::text)::uuid)
-- user   | tenant_isolation | ALL | (tenant_id = current_setting('app.tenant_id'::text)::uuid)
-- ... (all tables should have tenant_isolation policy)
```

**Verify RLS is enabled:**

```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- rowsecurity should be 't' (true) for all tenant-scoped tables
```

**Test RLS enforcement:**

```sql
-- Set tenant context (application does this automatically)
SET app.tenant_id = '550e8400-e29b-41d4-a716-446655440000';

-- Query tenant-scoped table
SELECT id, name FROM "Tenant";

-- Should return ONLY the tenant with matching ID
-- Other tenants' data should be invisible
```

**Manual RLS policy creation** (if missing):

```sql
-- Enable RLS on a table
ALTER TABLE "YourTable" ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY tenant_isolation ON "YourTable"
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Verify in application code:**

All database queries MUST go through the `prismaForTenant()` function:

```typescript
// src/lib/db/prisma.ts
export const prismaForTenant = (tenantId: string) => {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Sets app.tenant_id for RLS
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, TRUE)`,
            query(args),
          ]);
          return result;
        },
      },
    },
  });
};
```

**⚠️ RLS Bypass Risk:**

Using `prisma` directly instead of `prismaForTenant()` **bypasses RLS** and exposes all tenant data!

**Check codebase for violations:**

```bash
# From AEGIS root
grep -r "from '@/lib/db/prisma'" src/ --include="*.ts" --include="*.tsx" | grep -v "prismaForTenant"

# Expected: No results (or only utility functions that don't query tenant data)
```

### 5.5 Performance Optimization

**Database Indexing:**

Check `prisma/schema.prisma` for indexes:

```prisma
model Observation {
  @@index([tenantId, status])
  @@index([tenantId, branchId])
  @@index([tenantId, createdAt])
}
```

**Verify indexes in PostgreSQL:**

```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

**Add missing indexes:**

```bash
# Create migration
pnpm prisma migrate dev --name add_performance_indexes

# Edit migration file to add:
CREATE INDEX idx_observation_severity ON "Observation"(tenant_id, severity);
CREATE INDEX idx_engagement_status ON "Engagement"(tenant_id, status);

# Apply
pnpm prisma migrate deploy
```

**Query Performance Monitoring:**

```sql
-- Enable query logging (temporary)
ALTER DATABASE aegis SET log_min_duration_statement = 1000;  -- Log queries > 1 second

-- View slow queries
docker exec aegis-postgres tail -f /var/log/postgresql/postgresql-*.log | grep "duration:"

-- Disable after analysis
ALTER DATABASE aegis RESET log_min_duration_statement;
```

### 5.6 Database Maintenance

**Vacuum and Analyze:**

```bash
# Auto-vacuum is enabled by default in PostgreSQL 16
# Manual vacuum (run monthly):
docker exec aegis-postgres psql -U aegis -d aegis -c "VACUUM ANALYZE;"
```

**Check database size:**

```sql
SELECT
  pg_database.datname,
  pg_size_pretty(pg_database_size(pg_database.datname)) AS size
FROM pg_database
WHERE datname = 'aegis';
```

**Check table sizes:**

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
  pg_size_pretty(pg_relation_size(schemaname || '.' || tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename) - pg_relation_size(schemaname || '.' || tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname || '.' || tablename) DESC;
```

### 5.7 Database Operations Checklist

- [ ] Prisma migrations tested in development
- [ ] Migration strategy documented (deploy, rollback)
- [ ] Daily backup cron configured and tested
- [ ] Backup restoration tested successfully
- [ ] S3 lifecycle policy configured (30d → Glacier, 90d delete)
- [ ] RLS policies verified on all tenant-scoped tables
- [ ] RLS enforcement tested with manual queries
- [ ] Codebase scanned for direct `prisma` usage (should use `prismaForTenant`)
- [ ] Database indexes reviewed and optimized
- [ ] Slow query logging enabled for performance analysis
- [ ] Vacuum and analyze scheduled (monthly)
- [ ] Database size monitoring in place

---

## 6. Monitoring & Alerting

### 6.1 What to Monitor

**Application Metrics:**

1. **Uptime:** Is the app responding?
2. **Response time:** API latency (p50, p95, p99)
3. **Error rate:** 5xx errors, uncaught exceptions
4. **Request rate:** Requests per second
5. **Database connections:** Active vs. max pool size

**Infrastructure Metrics:**

1. **CPU usage:** Server load
2. **Memory usage:** Container memory, swap usage
3. **Disk usage:** Available storage
4. **Network:** Inbound/outbound traffic, packet loss

**Database Metrics:**

1. **Connection count:** Active connections
2. **Query performance:** Slow queries (>1s)
3. **Cache hit ratio:** PostgreSQL buffer cache efficiency
4. **Replication lag:** (if using read replicas)

**Business Metrics:**

1. **Active users:** Daily/monthly active users
2. **Audit engagements:** Created, in-progress, completed
3. **Observations:** Created, compliance rate
4. **Email delivery:** SES sent, bounces, complaints

### 6.2 Health Check Endpoint

**Already implemented** (verify it exists):

```typescript
// src/app/api/health/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
```

**Test:**

```bash
curl https://aegis.in/api/health
```

### 6.3 Uptime Monitoring (UptimeRobot — Free)

**Setup:**

1. Sign up: https://uptimerobot.com/
2. Add Monitor:
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `AEGIS Production`
   - URL: `https://aegis.in/api/health`
   - Monitoring Interval: **5 minutes**
   - Alert Contacts: Your email, Telegram, Slack

3. **Advanced Settings:**
   - Keyword exists: `"status":"ok"`
   - Alert when: Keyword not found OR status code != 200
   - Confirmation: 2 checks (prevent false alarms)

4. **Notification Channels:**
   - Email: Immediate
   - Telegram: Create bot, get chat ID, add to UptimeRobot
   - Slack: Create webhook, add to UptimeRobot

**Alternative: BetterUptime** (https://betteruptime.com/)

- Free tier: 10 monitors, 3-minute checks
- Phone call alerts available
- Incident management features

### 6.4 Application Performance Monitoring (APM)

**Option A: Sentry (Error Tracking — Free tier)**

```bash
# Install Sentry SDK
pnpm add @sentry/nextjs
```

**Configure Sentry** (`sentry.client.config.ts`):

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions
  debug: false,
});
```

**Add to `.env`:**

```env
NEXT_PUBLIC_SENTRY_DSN=https://abc123@o123456.ingest.sentry.io/7890123
```

**Benefits:**

- Real-time error tracking
- Stack traces with source maps
- User impact analysis
- Performance monitoring (slow transactions)
- Alerts via email, Slack, PagerDuty

**Setup:**

1. Sign up: https://sentry.io/
2. Create project: Next.js
3. Copy DSN
4. Follow integration guide: https://docs.sentry.io/platforms/javascript/guides/nextjs/

**Option B: LogRocket (Session Replay — Paid)**

- Records user sessions (video replay)
- Console logs, network requests
- User frustration signals (rage clicks, error clicks)
- Free tier: 1,000 sessions/month

### 6.5 Infrastructure Monitoring (Prometheus + Grafana)

**Why?**

- Coolify doesn't have built-in metrics dashboard
- Track CPU, memory, disk, network over time
- Visualize trends, set alerts

**Setup (Docker Compose):**

Create `docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: aegis-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    container_name: aegis-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter:latest
    container_name: aegis-node-exporter
    restart: unless-stopped
    ports:
      - "9100:9100"

volumes:
  prometheus_data:
  grafana_data:
```

**Prometheus config** (`monitoring/prometheus.yml`):

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'node'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'aegis-app'
    static_configs:
      - targets: ['aegis-app:3000']
```

**Start monitoring stack:**

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

**Access Grafana:**

```
http://YOUR_ELASTIC_IP:3001
```

- Username: `admin`
- Password: (from `GRAFANA_PASSWORD` env var)

**Import Dashboard:**

1. Add Prometheus data source: http://prometheus:9090
2. Import dashboard: 1860 (Node Exporter Full)
3. Create custom dashboard for AEGIS metrics

### 6.6 Log Aggregation (Loki + Promtail)

**Why?**

- Centralize logs from all containers
- Search logs across services
- Correlate logs with metrics

**Add to `docker-compose.monitoring.yml`:**

```yaml
  loki:
    image: grafana/loki:latest
    container_name: aegis-loki
    restart: unless-stopped
    ports:
      - "3100:3100"
    volumes:
      - ./monitoring/loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki

  promtail:
    image: grafana/promtail:latest
    container_name: aegis-promtail
    restart: unless-stopped
    volumes:
      - /var/log:/var/log
      - ./monitoring/promtail-config.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml
```

**Loki config** (`monitoring/loki-config.yml`):

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
  filesystem:
    directory: /loki/chunks
```

**Promtail config** (`monitoring/promtail-config.yml`):

```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker-logs
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: 'container'
```

**Query logs in Grafana:**

1. Add Loki data source: http://loki:3100
2. Explore → Select Loki
3. Query: `{container="aegis-app"} |= "error"`

### 6.7 Alerts Configuration

**Prometheus Alerting Rules** (`monitoring/alerts.yml`):

```yaml
groups:
  - name: aegis_alerts
    interval: 30s
    rules:
      # High CPU usage
      - alert: HighCPUUsage
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage detected"
          description: "CPU usage is above 80% for 5 minutes"

      # High memory usage
      - alert: HighMemoryUsage
        expr: (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage detected"
          description: "Memory usage is above 90% for 5 minutes"

      # Low disk space
      - alert: LowDiskSpace
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) * 100 < 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Low disk space"
          description: "Less than 10% disk space available"

      # Application down
      - alert: ApplicationDown
        expr: up{job="aegis-app"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "AEGIS application is down"
          description: "Application has been down for 2 minutes"
```

**Alertmanager config** (`monitoring/alertmanager.yml`):

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'email-notifications'

receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'alerts@aegis.in'
        from: 'prometheus@aegis.in'
        smarthost: 'email-smtp.ap-south-1.amazonaws.com:587'
        auth_username: 'AKIA...'  # SES SMTP credentials
        auth_password: '...'
        headers:
          Subject: '[AEGIS Alert] {{ .GroupLabels.severity | toUpper }}: {{ .GroupLabels.alertname }}'

  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#aegis-alerts'
        title: '{{ .GroupLabels.severity | toUpper }}: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}\n{{ .Annotations.description }}\n{{ end }}'
```

**Add Alertmanager to `docker-compose.monitoring.yml`:**

```yaml
  alertmanager:
    image: prom/alertmanager:latest
    container_name: aegis-alertmanager
    restart: unless-stopped
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
```

**Update Prometheus config** to use Alertmanager:

```yaml
# Add to prometheus.yml
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - '/etc/prometheus/alerts.yml'
```

### 6.8 Database Monitoring

**PostgreSQL Exporter:**

Add to `docker-compose.monitoring.yml`:

```yaml
  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: aegis-postgres-exporter
    restart: unless-stopped
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: "postgresql://aegis:${POSTGRES_PASSWORD}@postgres:5432/aegis?sslmode=disable"
```

**Update Prometheus config:**

```yaml
scrape_configs:
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
```

**Grafana Dashboard:**

Import dashboard 9628 (PostgreSQL Database) for instant metrics.

### 6.9 SES Monitoring

**CloudWatch Metrics:**

AWS SES automatically sends metrics to CloudWatch:

- Sends
- Bounces
- Complaints
- Delivery rate

**View in AWS Console:**

https://ap-south-1.console.aws.amazon.com/cloudwatch/home?region=ap-south-1#metricsV2:graph=~();namespace=AWS/SES

**Set CloudWatch Alarms:**

```bash
# High bounce rate alarm (>5%)
aws cloudwatch put-metric-alarm \
  --alarm-name aegis-ses-high-bounce-rate \
  --alarm-description "SES bounce rate above 5%" \
  --metric-name Reputation.BounceRate \
  --namespace AWS/SES \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 0.05 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:ap-south-1:ACCOUNT_ID:aegis-ses-alerts \
  --region ap-south-1

# High complaint rate alarm (>0.1%)
aws cloudwatch put-metric-alarm \
  --alarm-name aegis-ses-high-complaint-rate \
  --alarm-description "SES complaint rate above 0.1%" \
  --metric-name Reputation.ComplaintRate \
  --namespace AWS/SES \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 0.001 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:ap-south-1:ACCOUNT_ID:aegis-ses-alerts \
  --region ap-south-1
```

### 6.10 Monitoring Checklist

**Application:**

- [ ] Health check endpoint implemented and tested
- [ ] Uptime monitoring configured (UptimeRobot/BetterUptime)
- [ ] Error tracking configured (Sentry)
- [ ] Session replay considered (LogRocket — optional)

**Infrastructure:**

- [ ] Prometheus installed and scraping metrics
- [ ] Node Exporter monitoring server metrics
- [ ] Grafana dashboard created for server metrics
- [ ] PostgreSQL Exporter monitoring database
- [ ] Alerts configured for CPU, memory, disk

**Logging:**

- [ ] Application logs accessible (PM2/Docker logs)
- [ ] Nginx logs accessible
- [ ] Log aggregation considered (Loki — optional)
- [ ] Log rotation configured

**Alerting:**

- [ ] Alert channels configured (email, Slack, Telegram)
- [ ] Critical alerts: Application down, high error rate
- [ ] Warning alerts: High CPU, high memory, low disk
- [ ] On-call rotation documented

**Database:**

- [ ] Database metrics monitored (connections, query performance)
- [ ] Slow query logging enabled (temporarily for analysis)
- [ ] Backup success/failure alerts configured

**Email (SES):**

- [ ] CloudWatch metrics reviewed
- [ ] Bounce rate alarm set (<5%)
- [ ] Complaint rate alarm set (<0.1%)
- [ ] SNS topics subscribed for notifications

**Testing:**

- [ ] Trigger test alert (stop container, check notifications)
- [ ] Verify alert delivery time (<5 minutes)
- [ ] Test escalation (if no response in 15 minutes)

---

## Appendix A: Troubleshooting

### Application Won't Start

**Symptoms:**

- Coolify shows "Build failed" or "Container exited"
- Health check returns 503

**Diagnosis:**

```bash
# Check container logs
docker logs aegis-app --tail 100

# Common issues:
# 1. Missing environment variables → Check Coolify env vars
# 2. Database connection failed → Check POSTGRES_PASSWORD matches
# 3. Prisma schema mismatch → Run migrations
```

**Solutions:**

```bash
# 1. Verify all required env vars are set
docker exec aegis-app printenv | grep -E "DATABASE_URL|BETTER_AUTH"

# 2. Test database connection
docker exec aegis-postgres psql -U aegis -d aegis -c "SELECT 1"

# 3. Apply pending migrations
docker exec aegis-app npx prisma migrate deploy
```

### SSL Certificate Failed

**Symptoms:**

- Coolify shows "SSL generation failed"
- Browser shows "Not secure"

**Diagnosis:**

```bash
# Check DNS resolution
dig +short aegis.in

# Should return your Elastic IP
```

**Solutions:**

1. **DNS not propagated:** Wait 5-10 minutes, retry SSL generation
2. **Port 80 blocked:** Check AWS Security Group allows port 80 from 0.0.0.0/0
3. **Domain already has certificate:** Revoke old certificate in Coolify

### Database Connection Pool Exhausted

**Symptoms:**

- Errors: "Can't reach database server" or "Too many connections"

**Diagnosis:**

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE datname = 'aegis';

-- Check max connections
SHOW max_connections;
```

**Solutions:**

```prisma
// Increase connection pool in schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10  // Increase from default 5
}
```

### S3 Upload Failed

**Symptoms:**

- Evidence upload returns 500 error
- Logs show "Access Denied" or "Bucket not found"

**Diagnosis:**

```bash
# Test AWS credentials
aws s3 ls s3://aegis-evidence-123456789 --region ap-south-1

# If fails: Check IAM user permissions
```

**Solutions:**

1. **Verify IAM policy** grants `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`
2. **Check bucket name** in env vars matches actual bucket
3. **Verify region** is ap-south-1

### Email Not Sending

**Symptoms:**

- Password reset/invite emails not received
- Logs show SES errors

**Diagnosis:**

```bash
# Check SES identity status
aws ses get-email-identity \
  --email-identity aegis.in \
  --region ap-south-1

# Test email sending
aws ses send-email \
  --from "noreply@aegis.in" \
  --to "test@example.com" \
  --subject "Test" \
  --text "Test email" \
  --region ap-south-1
```

**Solutions:**

1. **Sandbox mode:** Verify recipient email in SES console
2. **Production access not granted:** Request production access (Section 1.5)
3. **DKIM not verified:** Check DNS records propagation
4. **IAM permissions:** Ensure SES user can `ses:SendEmail`

---

## Appendix B: Quick Reference

### Essential Commands

```bash
# SSH into server
ssh -i aegis-prod.pem ec2-user@YOUR_ELASTIC_IP

# View application logs
docker logs aegis-app --tail 100 --follow

# Restart application
docker restart aegis-app

# Access database shell
docker exec -it aegis-postgres psql -U aegis -d aegis

# Run migrations
docker exec aegis-app npx prisma migrate deploy

# Backup database
docker exec aegis-postgres pg_dump -U aegis -d aegis | gzip > backup-$(date +%Y%m%d).sql.gz

# Check health
curl https://aegis.in/api/health

# View Nginx logs
sudo tail -f /var/log/nginx/access.log

# Reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

### Important URLs

```
# Application
https://aegis.in

# Coolify Dashboard
http://YOUR_ELASTIC_IP:8000

# Grafana (if monitoring stack deployed)
http://YOUR_ELASTIC_IP:3001

# Prometheus
http://YOUR_ELASTIC_IP:9090

# AWS SES Console
https://ap-south-1.console.aws.amazon.com/ses/home?region=ap-south-1

# AWS S3 Console
https://s3.console.aws.amazon.com/s3/buckets/aegis-evidence-ACCOUNT_ID?region=ap-south-1

# GitHub Repository
https://github.com/your-org/aegis

# GitHub Actions
https://github.com/your-org/aegis/actions
```

### Environment Variables Quick Reference

```env
# Minimum required for production:
DATABASE_URL=postgresql://aegis:PASSWORD@postgres:5432/aegis
BETTER_AUTH_SECRET=<openssl-rand-base64-32>
BETTER_AUTH_URL=https://aegis.in
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=aegis-evidence-123456789
SES_FROM_EMAIL=noreply@aegis.in
NEXT_PUBLIC_APP_URL=https://aegis.in
NODE_ENV=production
```

### Secrets Rotation Schedule

| Secret                  | Rotation Frequency | How to Rotate                                    |
| ----------------------- | ------------------ | ------------------------------------------------ |
| BETTER_AUTH_SECRET      | Every 90 days      | Generate new, update env, restart app            |
| POSTGRES_PASSWORD       | Every 90 days      | Update in Docker, update env, restart containers |
| AWS_ACCESS_KEY_ID       | Every 90 days      | Create new IAM key, update env, delete old key   |
| AWS_SECRET_ACCESS_KEY   | Every 90 days      | (Same as above)                                  |
| Coolify root password   | Every 90 days      | Settings → Account → Change Password             |
| SSH key                 | Every 365 days     | Generate new, add to EC2, remove old             |
| SSL certificate         | Auto-renewed       | Let's Encrypt auto-renews every 60 days          |

---

## Appendix C: Disaster Recovery

### Scenario 1: EC2 Instance Failure

**Recovery Steps:**

1. **Launch new EC2 instance** (same config as before)
2. **Attach Elastic IP** to new instance
3. **Install Coolify:**
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
4. **Restore database from S3:**
   ```bash
   aws s3 cp s3://aegis-evidence-123456789/backups/database/latest.sql.gz . --region ap-south-1
   # Follow restoration steps in Section 5.3
   ```
5. **Redeploy application** via Coolify
6. **Verify functionality** (login, create engagement, upload evidence)

**Recovery Time Objective (RTO):** 2 hours  
**Recovery Point Objective (RPO):** 24 hours (daily backup)

### Scenario 2: Database Corruption

**Recovery Steps:**

1. **Stop application:** `docker stop aegis-app`
2. **Download latest backup:** (Section 5.3)
3. **Drop corrupted database:**
   ```bash
   docker exec aegis-postgres psql -U aegis -d postgres -c "DROP DATABASE aegis;"
   ```
4. **Restore from backup:** (Section 5.3)
5. **Run migrations:** `docker exec aegis-app npx prisma migrate deploy`
6. **Restart application:** `docker start aegis-app`
7. **Verify data integrity**

**RTO:** 30 minutes  
**RPO:** 24 hours

### Scenario 3: Accidental Data Deletion

**Recovery Steps:**

1. **Identify affected tenant/table**
2. **Find backup timestamp** before deletion
3. **Restore to temporary database:**
   ```bash
   docker exec aegis-postgres psql -U aegis -d postgres -c "CREATE DATABASE aegis_restore OWNER aegis;"
   gunzip -c backup.sql.gz | docker exec -i aegis-postgres psql -U aegis -d aegis_restore
   ```
4. **Export affected data:**
   ```sql
   \c aegis_restore
   COPY (SELECT * FROM "Tenant" WHERE id = '...') TO '/tmp/recovered.csv' CSV HEADER;
   ```
5. **Import to production:**
   ```sql
   \c aegis
   COPY "Tenant" FROM '/tmp/recovered.csv' CSV HEADER;
   ```

**RTO:** 1 hour  
**RPO:** 24 hours

### Scenario 4: Security Breach

**Immediate Actions:**

1. **Rotate all secrets** (database password, AWS keys, auth secret)
2. **Review access logs:**
   ```bash
   sudo cat /var/log/nginx/access.log | grep -E "POST|PUT|DELETE"
   ```
3. **Check database for unauthorized changes:**
   ```sql
   SELECT * FROM "AuditLog" WHERE created_at > NOW() - INTERVAL '24 hours' ORDER BY created_at DESC;
   ```
4. **Revoke compromised IAM keys:**
   ```bash
   aws iam delete-access-key --access-key-id AKIA... --user-name aegis-ses
   ```
5. **Force password reset** for all users
6. **Restore from known-good backup** if data integrity compromised
7. **Incident post-mortem:** Document breach, update security policies

---

## Appendix D: Cost Optimization

**Current Monthly Estimate (ap-south-1):**

| Resource               | Specs                   | Cost/Month (USD) |
| ---------------------- | ----------------------- | ---------------- |
| EC2 t3.small           | 2 vCPU, 2 GB RAM        | ~$15             |
| Elastic IP             | (free when attached)    | $0               |
| EBS 30 GB GP3          | 30 GB, 3000 IOPS        | ~$3              |
| S3 Standard            | 10 GB storage           | ~$0.25           |
| S3 Requests            | 10,000 PUT, 50,000 GET  | ~$0.10           |
| Data Transfer Out      | 10 GB/month             | ~$1              |
| SES (in-region)        | 1,000 emails/day        | $0 (62,000 free) |
| **Total**              |                         | **~$20/month**   |

**Cost Reduction Strategies:**

1. **Use Reserved Instance** (1-year commitment):
   - Savings: 30-40% (~$6/month)

2. **S3 Lifecycle to Glacier** (already configured):
   - Backups >30 days old: $0.004/GB vs. $0.025/GB
   - Savings: ~$0.20/month (scales with backup size)

3. **CloudFront CDN** (optional, for static assets):
   - Reduce S3 GET requests by 80%
   - Free tier: 1 TB transfer/month

4. **Database Query Optimization:**
   - Reduce CPU usage → downgrade to t3.micro?
   - Monitor with CloudWatch first

5. **SES vs. SendGrid/Mailgun:**
   - SES: $0.10 per 1,000 emails (after free tier)
   - Competitors: $15-20/month for similar volume
   - **Stick with SES** — significantly cheaper

---

**END OF DEPLOYMENT GUIDE**

For questions or updates, contact: devops@aegis.in
