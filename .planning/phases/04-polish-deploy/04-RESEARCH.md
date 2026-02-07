# Phase 4: Polish & Deployment - Research

**Researched:** February 7, 2026
**Domain:** i18n, responsive design, AWS deployment, demo preparation
**Confidence:** HIGH

## Summary

This phase covers three major areas: multi-language support (i18n) for English, Hindi, Marathi, and Gujarati; responsive design polish including print stylesheets; and AWS deployment to Mumbai region. For i18n, **next-intl** is the clear winner for Next.js 14 App Router - it's actively maintained (updated January 2026), has excellent documentation, and is purpose-built for the App Router architecture. For AWS deployment, **AWS Lightsail Mumbai** offers the right balance of simplicity, cost-effectiveness, and geographic proximity for Indian UCBs. The deployment pattern uses PM2 for process management, Nginx as reverse proxy, and Let's Encrypt for SSL certificates.

**Primary recommendation:** Use next-intl for i18n with shadcn/ui Sheet component for mobile navigation, deploy to AWS Lightsail Mumbai with PM2+Nginx+Certbot stack.

## User Constraints (from CONTEXT.md)

> No CONTEXT.md exists for this phase. The planner should proceed based on Phase 1 decisions:
> - Next.js 14 with App Router
> - TypeScript
> - Tailwind CSS
> - shadcn/ui components
> - Languages: EN/HI/MR/GU
> - Mumbai region deployment preferred for Indian users

## Standard Stack

### Core i18n
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next-intl | 3.x (latest) | i18n for Next.js App Router | **Only viable choice** for App Router; next-i18next is NOT compatible |
| @formatjs/intl-pluralrules | latest | Pluralization support | Required by next-intl for complex plurals in HI/MR/GU |

### Responsive & Navigation
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| lucide-react | latest | Globe icon for language switcher | Already used with shadcn/ui |
| clsx | latest | Conditional className utilities | Tailwind + shadcn/ui standard |
| tailwind-merge | latest | Merge Tailwind classes | shadcn/ui standard utility |

### AWS Deployment
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| PM2 | latest | Node.js process manager | Zero-downtime deployments, auto-restart |
| Nginx | stable | Reverse proxy & SSL termination | Industry standard for Node.js deployments |
| Certbot | latest | Let's Encrypt SSL automation | Free SSL, automatic renewal |
| AWS Lightsail | Ubuntu 22.04 | Hosting platform | Simple, cost-effective, Mumbai region available |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| next-intl | react-intl | Not App Router optimized; more setup required |
| AWS Lightsail | AWS EC2 | More complex, more expensive for single app |
| Let's Encrypt | AWS Certificate Manager | ACM requires CloudFront or ALB (adds complexity/cost) |
| PM2 | Docker | More complexity for single-app deployment |

**Installation:**
```bash
# i18n packages
npm install next-intl
npm install @formatjs/intl-pluralrules

# Deployment (on server)
sudo apt update
sudo apt install nginx nodejs npm
sudo npm install -g pm2
sudo apt install certbot python3-certbot-nginx
```

## Architecture Patterns

### Recommended Project Structure for i18n
```
src/
├── app/
│   ├── [locale]/           # Locale wrapper for routing
│   │   ├── layout.tsx      # Root layout with locale param
│   │   ├── page.tsx        # Dashboard
│   │   ├── compliance/     # Compliance Registry
│   │   ├── audit-plan/     # Audit Plan
│   │   ├── findings/       # Findings
│   │   └── report/         # Board Report
│   └── globals.css
├── components/
│   ├── LanguageSwitcher.tsx  # Globe icon + dropdown
│   └── MobileSidebar.tsx     # Sheet component for mobile
├── i18n/
│   ├── config.ts            # Locale configuration
│   ├── request.ts           # Next-intl request config
│   └── locales/
│       ├── en/
│       │   └── common.json  # English translations
│       ├── hi/
│       │   └── common.json  # Hindi translations
│       ├── mr/
│       │   └── common.json  # Marathi translations
│       └── gu/
│       │   └── common.json  # Gujarati translations
└── middleware.ts            # Locale negotiation middleware
```

### Pattern 1: next-intl Setup with App Router
**What:** Configure next-intl for prefix-based routing with locale negotiation
**When to use:** All Next.js 14 App Router projects requiring i18n

**Configuration:**

```typescript
// src/i18n/config.ts
export const locales = ['en', 'hi', 'mr', 'gu'] as const;
export const defaultLocale = 'en' as const;
export type Locale = (typeof locales)[number];

// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from './config';

export default getRequestConfig(async ({ locale }) => {
  if (!locales.includes(locale as any)) notFound();

  return {
    messages: (await import(`./locales/${locale}/common.json`)).default
  };
});

// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './src/i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always' // URLs always include locale prefix
});

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
```

**Source:** [next-intl middleware documentation](https://next-intl.dev/docs/routing/middleware), [next-intl routing configuration](https://next-intl.dev/docs/routing/configuration)

### Pattern 2: Language Switcher with Cookie Persistence
**What:** Dropdown language switcher that persists user preference
**When to use:** Any i18n app requiring user language selection

```typescript
// src/components/LanguageSwitcher.tsx
'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const locales = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिंदी' },
  { code: 'mr', name: 'मराठी' },
  { code: 'gu', name: 'ગુજરાતી' },
];

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      // Replace locale in pathname
      const segments = pathname.split('/');
      segments[1] = newLocale;
      router.replace(segments.join('/'));
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending}>
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc.code}
            onClick={() => switchLocale(loc.code)}
            className={locale === loc.code ? 'bg-accent' : ''}
          >
            {loc.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Source:** [Medium: Next.js 15 Language Switcher](https://medium.com/@annasaaddev/how-to-implement-language-switching-in-your-website-with-next-js-15-fec85c7199c9)

### Pattern 3: Translation File Structure
**What:** Organized JSON files for banking terminology translations
**When to use:** All i18n implementations

```json
// src/i18n/locales/en/common.json
{
  "nav": {
    "dashboard": "Dashboard",
    "compliance": "Compliance Registry",
    "auditPlan": "Audit Plan",
    "findings": "Findings",
    "boardReport": "Board Report"
  },
  "compliance": {
    "requirement": "Requirement",
    "status": "Status",
    "deadline": "Deadline",
    "assignee": "Assignee",
    "priority": "Priority"
  },
  "status": {
    "compliant": "Compliant",
    "nonCompliant": "Non-Compliant",
    "pending": "Pending",
    "overdue": "Overdue"
  }
}

// src/i18n/locales/hi/common.json
{
  "nav": {
    "dashboard": "डैशबोर्ड",
    "compliance": "अनुपालन रजिस्टर",
    "auditPlan": "ऑडिट योजना",
    "findings": "निष्कर्ष",
    "boardReport": "बोर्ड रिपोर्ट"
  },
  "compliance": {
    "requirement": "आवश्यकता",
    "status": "स्थिति",
    "deadline": "समयसीमा",
    "assignee": "सौंपा गया",
    "priority": "प्राथमिकता"
  },
  "status": {
    "compliant": "अनुपालक",
    "nonCompliant": "गैर-अनुपालक",
    "pending": "लंबित",
    "overdue": "अतिदेय"
  }
}
```

**Key insight:** Banking terminology MUST be translated by certified financial translators familiar with RBI/SEBI regulations. Incorrect compliance terminology can have serious implications.

### Anti-Patterns to Avoid
- **Using next-i18next with App Router:** It is NOT compatible. Use next-intl.
- **Hardcoding locale in client components:** Always use `useLocale()` hook from next-intl
- **Storing translations in component files:** Keep all translations in `/locales` directory
- **Machine translation for compliance terms:** Use certified translators for banking terminology

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| i18n routing | Custom locale detection and routing | next-intl middleware | Handles edge cases, cookie persistence, redirects automatically |
| Mobile menu | Custom drawer with animations | shadcn/ui Sheet component | Accessible, tested, animated by default |
| Process management | Custom Node.js scripts | PM2 ecosystem | Auto-restart on crash, log management, zero-downtime reloads |
| SSL certificates | Manual cert installation | Certbot | Automatic renewal before expiration |
| Language detection | Browser language parsing | next-intl's built-in detection | Handles Accept-Language header, cookie, URL prefix priority |

**Key insight:** The middleware-based locale negotiation in next-intl handles the complex priority chain: URL prefix > saved cookie > Accept-Language header > default locale. Building this yourself is error-prone.

## Common Pitfalls

### Pitfall 1: next-i18next Incompatibility with App Router
**What goes wrong:** Attempting to use next-i18next results in routing errors and locale detection failures
**Why it happens:** next-i18next was designed for Pages Router and doesn't work with App Router's server components
**How to avoid:** Use next-intl from the start. The migration is non-trivial
**Warning signs:** "i18next is not configured" errors, locale not being detected from URLs

### Pitfall 2: Missing Locale Prefix on Static Links
**What goes wrong:** Navigation links break when locale prefix is not included
**Why it happens:** Next-intl requires all internal routes to include locale prefix when using `localePrefix: 'always'`
**How to avoid:** Use `usePathname()` and `useLocale()` hooks, or `Link` from next-intl
**Warning signs:** 404 errors when navigating between pages

### Pitfall 3: Nginx Reverse Proxy Port Misconfiguration
**What goes wrong:** Next.js redirects add internal port numbers to URLs (e.g., `:3000`)
**Why it happens:** Next.js is unaware it's behind a proxy and uses internal port
**How to avoid:**
```nginx
# In nginx server block
location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```
**Warning signs:** URLs showing `:3000` or other internal ports

### Pitfall 4: Touch Targets Too Small on Mobile
**What goes wrong:** Users can't tap buttons reliably on mobile devices
**Why it happens:** Desktop-designed buttons without mobile consideration
**How to avoid:** Minimum touch target of 44x44 pixels (Apple HIG standard)
**Warning signs:** User complaints about "missing" taps, rage clicks

### Pitfall 5: SSL Certificate Expiration
**What goes wrong:** Site becomes inaccessible with certificate warnings
**Why it happens:** Let's Encrypt certificates expire every 90 days
**How to avoid:** Certbot sets up automatic renewal via systemd timer
**Warning signs:** Check with `sudo certbot renew --dry-run`

## Code Examples

### PM2 Ecosystem Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'aegis',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    cwd: '/var/www/aegis',
    instances: 2, // For 2-core server
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/aegis-error.log',
    out_file: '/var/log/pm2/aegis-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }];
};

// Usage
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**Source:** [PM2 deployment documentation](https://pm2.keymetrics.io/docs/usage/deployment/), [Next.js PM2 deployment guide](https://blog.devops.dev/deploying-next-js-on-a-linux-server-with-pm2-nginx-5e83dcbc997f)

### Nginx Configuration with SSL
```nginx
# /etc/nginx/sites-available/aegis
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL configuration (managed by Certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Source:** [DigitalOcean Nginx Let's Encrypt Guide](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-20-04)

### Print Stylesheet for Board Report
```css
/* src/app/[locale]/report/print.css */
@media print {
  /* Hide navigation elements */
  .sidebar,
  .header,
  .language-switcher,
  .no-print {
    display: none !important;
  }

  /* Set page size and margins */
  @page {
    size: A4;
    margin: 15mm 15mm 15mm 15mm;
  }

  /* Ensure content fits page */
  body {
    width: 100%;
    max-width: none;
    font-size: 10pt;
    color: black;
    background: white;
  }

  /* Avoid page breaks inside important elements */
  .finding-card,
  .compliance-item {
    page-break-inside: avoid;
  }

  /* Page breaks before sections */
  .report-section {
    page-break-before: always;
  }
  .report-section:first-of-type {
    page-break-before: avoid;
  }

  /* Print links as URLs */
  a[href^="http"]::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
  }
}
```

**Source:** [MDN Printing Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing), [Print CSS Cheatsheet](https://www.customjs.space/blog/print-css-cheatsheet)

### Responsive Hamburger Menu with shadcn/ui Sheet
```typescript
// src/components/MobileSidebar.tsx
'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useTranslations } from 'next-intl';

const navItems = [
  { key: 'dashboard', href: '/dashboard' },
  { key: 'compliance', href: '/compliance' },
  { key: 'auditPlan', href: '/audit-plan' },
  { key: 'findings', href: '/findings' },
  { key: 'boardReport', href: '/report' },
];

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const t = useTranslations('nav');

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <nav className="flex flex-col gap-4 mt-8">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={`/${item.href}`}
              onClick={() => setOpen(false)}
              className="text-lg font-medium py-2 px-4 rounded-md hover:bg-accent"
            >
              {t(item.key as any)}
            </a>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
```

**Source:** [shadcn/ui Sheet Navigation Pattern](https://www.shadcn.io/patterns/sheet-navigation-1)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| next-i18next | next-intl | Next.js 13+ (App Router) | Only next-intl supports App Router properly |
| Manual SSL setup | Certbot automation | ~2016 | Industry standard for free, auto-renewing SSL |
| Custom mobile menus | Component libraries (shadcn/ui Sheet) | ~2023-2024 | Accessibility and animations built-in |
| Global CSS breakpoints | Component-level responsive classes | Tailwind v3+ | Mobile-first utility-first approach |

**Deprecated/outdated:**
- next-i18next for App Router: Use next-intl instead
- Accept-Language-only locale detection: Modern approach uses URL prefix > cookie > header > default

## Open Questions

1. **Banking terminology translation quality**
   - What we know: Professional translation services (Devnagri, iTranslationWorld) specialize in BFSI
   - What's unclear: Whether we need to budget for professional translation vs. using internal staff
   - Recommendation: For MVP, use internal staff review. For production, engage certified BFSI translators

2. **Static export vs SSR for deployment**
   - What we know: next-intl supports both, with tradeoffs
   - What's unclear: Whether AEGIS needs SSR for demo purposes
   - Recommendation: Use SSR (standard Next.js) for MVP as it supports all features

3. **Domain and SSL timing**
   - What we know: Certbot requires domain to point to server before issuance
   - What's unclear: Whether domain is already purchased
   - Recommendation: Purchase domain early, configure DNS before deployment day

## Sources

### Primary (HIGH confidence)
- [next-intl Documentation](https://next-intl.dev/) - Routing, middleware, configuration
- [next-intl Examples](https://next-intl.dev/examples) - Verified updated January 13, 2026
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) - Official breakpoint values
- [PM2 Deployment Documentation](https://pm2.keymetrics.io/docs/usage/deployment/) - Official PM2 docs
- [MDN Printing CSS](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Media_queries/Printing) - Print media queries

### Secondary (MEDIUM confidence)
- [Intlayer: next-i18next vs next-intl comparison](https://intlayer.org/blog/next-i18next-vs-next-intl-vs-intlayer) - Confirms next-intl as App Router choice
- [Devnagri Banking Translation Services](https://devnagri.com/banking-finance-translation/) - BFSI translation requirements
- [AWS Lightsail Pricing](https://aws.amazon.com/lightsail/pricing/) - Current pricing
- [shadcn/ui Sheet Navigation Pattern](https://www.shadcn.io/patterns/sheet-navigation-1) - Mobile menu implementation
- [Certbot EFF Instructions](https://certbot.eff.org/instructions?ws=nginx&os=ubuntufocal) - Let's Encrypt setup

### Tertiary (LOW confidence)
- Various WebSearch results verified with official sources above

## Metadata

**Confidence breakdown:**
- i18n stack (next-intl): HIGH - Official docs confirm App Router support, actively maintained
- AWS deployment (PM2+Nginx+Certbot): HIGH - Industry standard, well-documented
- Responsive design patterns: HIGH - Tailwind and shadcn/ui docs are authoritative
- Banking translation approach: MEDIUM - WebSearch only, recommend professional validation
- Demo script structure: MEDIUM - WebSearch from sales/demo resources

**Research date:** February 7, 2026
**Valid until:** March 9, 2026 (30 days - stable deployment patterns)
