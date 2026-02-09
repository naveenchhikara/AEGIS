#!/usr/bin/env bash
# AEGIS - AWS S3 Evidence Bucket Setup Script
# ===========================================
# This script creates and configures the S3 bucket for audit evidence storage.
# Evidence files are IMMUTABLE — the IAM policy grants PutObject + GetObject ONLY.
# No DeleteObject permission. If a wrong file is uploaded, upload a replacement.
#
# Prerequisites:
#   - AWS CLI v2 installed and configured
#   - Sufficient IAM permissions to create buckets, policies, and users
#
# Usage:
#   ./scripts/setup-s3.sh [dev|staging|prod]
#
# DR Note (Decision DE10):
#   If cross-region replication is needed, target MUST be ap-south-2 (Hyderabad).
#   Never replicate to a non-India AWS region (RBI data localization requirement).

set -euo pipefail

ENV="${1:-dev}"
BUCKET_NAME="aegis-evidence-${ENV}"
REGION="ap-south-1"  # Mumbai — RBI data localization requirement
IAM_USER="aegis-s3-user-${ENV}"

echo "=== AEGIS S3 Evidence Bucket Setup ==="
echo "Environment: ${ENV}"
echo "Bucket:      ${BUCKET_NAME}"
echo "Region:      ${REGION}"
echo ""

# --- Step 1: Create S3 Bucket ---
echo "[1/6] Creating S3 bucket..."
aws s3api create-bucket \
  --bucket "${BUCKET_NAME}" \
  --region "${REGION}" \
  --create-bucket-configuration LocationConstraint="${REGION}"

# --- Step 2: Enable Versioning ---
echo "[2/6] Enabling versioning (evidence immutability)..."
aws s3api put-bucket-versioning \
  --bucket "${BUCKET_NAME}" \
  --versioning-configuration Status=Enabled

# --- Step 3: Enable Server-Side Encryption (SSE-S3) ---
echo "[3/6] Enabling server-side encryption (SSE-S3)..."
aws s3api put-bucket-encryption \
  --bucket "${BUCKET_NAME}" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      },
      "BucketKeyEnabled": true
    }]
  }'

# --- Step 4: Block All Public Access ---
echo "[4/6] Blocking all public access..."
aws s3api put-public-access-block \
  --bucket "${BUCKET_NAME}" \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# --- Step 5: Configure CORS ---
echo "[5/6] Configuring CORS for presigned URL uploads..."
aws s3api put-bucket-cors \
  --bucket "${BUCKET_NAME}" \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedOrigins": ["http://localhost:3000", "https://aegis-audit.com"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }]
  }'

# --- Step 6: Lifecycle Policy (cleanup incomplete multipart uploads) ---
echo "[6/6] Setting lifecycle policy..."
aws s3api put-bucket-lifecycle-configuration \
  --bucket "${BUCKET_NAME}" \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "cleanup-incomplete-uploads",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }]
  }'

echo ""
echo "=== Bucket created successfully ==="
echo ""

# --- Create IAM User with Restricted Policy ---
echo "=== Creating IAM User: ${IAM_USER} ==="

# Create IAM user
aws iam create-user --user-name "${IAM_USER}"

# Create IAM policy — PutObject + GetObject ONLY (NO DeleteObject)
# Evidence is immutable once uploaded (Decision D10, Skeptic S6)
POLICY_DOC=$(cat <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowEvidenceUploadAndRead",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::${BUCKET_NAME}/*"
    },
    {
      "Sid": "AllowBucketListing",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::${BUCKET_NAME}"
    }
  ]
}
POLICY
)

POLICY_ARN=$(aws iam create-policy \
  --policy-name "aegis-evidence-${ENV}-policy" \
  --policy-document "${POLICY_DOC}" \
  --query 'Policy.Arn' \
  --output text)

aws iam attach-user-policy \
  --user-name "${IAM_USER}" \
  --policy-arn "${POLICY_ARN}"

# Generate access keys
echo ""
echo "=== Generating Access Keys ==="
echo "IMPORTANT: Save these credentials securely. They will only be shown once."
echo ""
aws iam create-access-key --user-name "${IAM_USER}"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Add these to your .env file:"
echo "  AWS_REGION=${REGION}"
echo "  AWS_ACCESS_KEY_ID=<from above>"
echo "  AWS_SECRET_ACCESS_KEY=<from above>"
echo "  S3_BUCKET_NAME=${BUCKET_NAME}"
echo ""
echo "DR Note: If replication is needed, target ap-south-2 (Hyderabad) ONLY."
echo "Never replicate outside India (RBI data localization requirement)."
