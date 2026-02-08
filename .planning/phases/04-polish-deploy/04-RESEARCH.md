# Phase 4: Polish & Deploy - Research

**Researched:** 2026-02-08
**Domain:** Internationalization (i18n), Responsive Design, AWS Deployment
**Confidence:** HIGH

## Summary

Phase 4 covers three distinct domains: (1) multi-language support with next-intl for Hindi, Marathi, and Gujarati, (2) responsive design polish for mobile/tablet, and (3) AWS Lightsail deployment to Mumbai region with SSL. All three are well-documented with established patterns.

The i18n approach should use next-intl v4.x in "without i18n routing" mode -- this avoids URL prefixes and `[locale]` folder restructuring while using a cookie-based locale preference. This is the simplest approach for a prototype where locale is a user preference, not a routing concern. The existing language switcher in `top-bar.tsx` already has the UI shell; it needs to be connected to next-intl's cookie mechanism and trigger a page refresh.

Font support is a critical concern: Inter (the current font) does NOT support Devanagari (Hindi/Marathi) or Gujarati scripts. Noto Sans + Noto Sans Devanagari + Noto Sans Gujarati must be loaded via `next/font/google` and applied conditionally based on the active locale.

**Primary recommendation:** Use next-intl v4.x without i18n routing (cookie-based locale), Noto Sans for multi-script support, and AWS Lightsail $5/month Ubuntu instance with Nginx + PM2 + Let's Encrypt for deployment.

## Standard Stack

### Core

| Library              | Version | Purpose                               | Why Standard                                                                                       |
| -------------------- | ------- | ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| next-intl            | ^4.8    | i18n framework for Next.js App Router | De facto standard for Next.js i18n; ICU message format; supports both Server and Client Components |
| Noto Sans            | -       | Latin script font                     | Google's universal font family; matches well with Devanagari/Gujarati variants                     |
| Noto Sans Devanagari | -       | Hindi/Marathi script font             | Google's official Devanagari font; covers Hindi and Marathi                                        |
| Noto Sans Gujarati   | -       | Gujarati script font                  | Google's official Gujarati font                                                                    |
| PM2                  | latest  | Node.js process manager               | Auto-restart, logging, system startup integration                                                  |
| Nginx                | latest  | Reverse proxy                         | SSL termination, static file serving, proxy to Node.js                                             |
| Certbot              | latest  | Let's Encrypt SSL client              | Free SSL certificates, auto-renewal                                                                |

### Supporting

| Library          | Version | Purpose           | When to Use               |
| ---------------- | ------- | ----------------- | ------------------------- |
| @media print CSS | N/A     | Print/PDF styling | RPT-06 print preview mode |

### Alternatives Considered

| Instead of                | Could Use                            | Tradeoff                                                                                                        |
| ------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| next-intl                 | react-i18next                        | react-i18next works but lacks Next.js App Router-specific optimizations; next-intl is purpose-built for Next.js |
| next-intl without routing | next-intl with localePrefix: 'never' | localePrefix: 'never' still requires [locale] folder restructure; without-routing mode avoids this entirely     |
| Noto Sans                 | Mukta font family                    | Mukta covers Devanagari+Gujarati+Latin but has fewer weights; Noto Sans gives more flexibility                  |
| AWS Lightsail             | Vercel                               | Lightsail chosen for data localization (Mumbai region, RBI compliance) and cost predictability                  |
| Nginx + PM2               | Docker container                     | Overkill for a demo prototype; Nginx+PM2 is simpler and well-documented                                         |

**Installation:**

```bash
pnpm add next-intl
```

No additional packages needed for fonts (loaded via `next/font/google`) or deployment tools (installed on server).

## Architecture Patterns

### i18n File Structure (without routing)

```
messages/
  en.json              # English translations
  hi.json              # Hindi translations
  mr.json              # Marathi translations
  gu.json              # Gujarati translations
src/
  i18n/
    request.ts          # Request-scoped config (reads locale from cookie)
  app/
    layout.tsx          # Wraps children with NextIntlClientProvider
    (dashboard)/
      layout.tsx        # No changes needed to folder structure
```

**Key advantage:** No `[locale]` folder needed. No URL prefixes. No middleware/proxy.ts needed. The locale is determined from a cookie in `request.ts` and all components read translations from the provider.

### Pattern 1: Cookie-Based Locale Detection (No Routing)

**What:** Determine locale from a cookie instead of URL path segments
**When to use:** Single-URL prototype where locale is a user preference, not a routing concern

```typescript
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = store.get("NEXT_LOCALE")?.value || "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

```typescript
// next.config.ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {};
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```

### Pattern 2: Language Switcher with Cookie + Refresh

**What:** Switch language by setting a cookie and refreshing the page
**When to use:** For the language switcher UI component

```typescript
// Language switching in a Client Component
"use client";

import { useRouter } from "next/navigation";

function switchLocale(locale: string) {
  document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=${60 * 60 * 24 * 365}`;
  window.location.reload(); // Full refresh to re-run request.ts
}
```

**Important:** `window.location.reload()` is needed because `request.ts` runs on the server. A client-side `router.refresh()` from Next.js may also work (it triggers a server re-render), but a full reload is the most reliable approach for a prototype.

### Pattern 3: Translation Namespace Organization

**What:** Organize translations by page/component for maintainability
**When to use:** For all translation files

```json
{
  "Common": {
    "appName": "AEGIS",
    "save": "Save",
    "cancel": "Cancel",
    "search": "Search",
    "filter": "Filter",
    "export": "Export",
    "print": "Print"
  },
  "Navigation": {
    "dashboard": "Dashboard",
    "compliance": "Compliance Registry",
    "auditPlans": "Audit Plans",
    "findings": "Findings",
    "reports": "Board Report",
    "auditee": "Auditee Portal",
    "settings": "Settings"
  },
  "Dashboard": {
    "complianceHealth": "Compliance Health Score",
    "auditCoverage": "Audit Coverage",
    "totalFindings": "Total Findings",
    "criticalFindings": "Critical Findings"
  },
  "Compliance": {
    "title": "Compliance Registry",
    "requirementId": "Requirement ID",
    "category": "Category",
    "status": "Status"
  }
}
```

### Pattern 4: Conditional Font Loading by Locale

**What:** Load script-specific fonts based on active locale
**When to use:** Root layout to ensure correct script rendering

```typescript
// src/app/layout.tsx
import {
  Noto_Sans,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
} from "next/font/google";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto-sans",
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-noto-devanagari",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const notoSansGujarati = Noto_Sans_Gujarati({
  subsets: ["gujarati"],
  variable: "--font-noto-gujarati",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
```

Then apply the appropriate font-family via CSS based on the `lang` attribute on `<html>`:

```css
html[lang="hi"] body,
html[lang="mr"] body {
  font-family: var(--font-noto-devanagari), var(--font-noto-sans), sans-serif;
}
html[lang="gu"] body {
  font-family: var(--font-noto-gujarati), var(--font-noto-sans), sans-serif;
}
```

### Pattern 5: Print/PDF Preview Mode

**What:** Clean print stylesheet for board reports
**When to use:** RPT-06 requirement

```css
@media print {
  /* Hide navigation and chrome */
  nav,
  .sidebar,
  header,
  footer,
  .no-print {
    display: none !important;
  }

  /* Clean page layout */
  body {
    background: white;
    color: black;
    font-size: 12pt;
  }

  /* Page break control */
  .page-break-before {
    page-break-before: always;
  }
  .page-break-after {
    page-break-after: always;
  }
  .avoid-break {
    page-break-inside: avoid;
  }

  /* Table styling for print */
  table {
    border-collapse: collapse;
    width: 100%;
  }
  th,
  td {
    border: 1px solid #000;
    padding: 4px 8px;
  }
}
```

### Anti-Patterns to Avoid

- **Using next-intl with [locale] routing for a prototype:** Adds complexity for no benefit. The app has no SEO needs (it's a demo tool) and no need for locale in URLs.
- **Switching to Inter font with Devanagari subset:** Inter does NOT have a Devanagari or Gujarati variant. Must use Noto Sans family.
- **Using react-intl or i18next instead of next-intl:** These lack Next.js App Router-specific optimizations. next-intl handles Server Components natively.
- **Building custom i18n system:** next-intl handles ICU message format, pluralization, number/date formatting out of the box.
- **Hardcoding translations in components:** Always use translation keys and message files.
- **Using `next export` (static export):** This project uses dynamic features (cookies for locale). Standard `next build` + `next start` is correct.

## Don't Hand-Roll

| Problem            | Don't Build                      | Use Instead                               | Why                                                                                 |
| ------------------ | -------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------- |
| i18n framework     | Custom translation lookup        | next-intl                                 | ICU message format, pluralization, number/date formatting, Server+Client components |
| Locale detection   | Custom cookie parsing            | next-intl getRequestConfig with cookies() | Race conditions, SSR/client mismatch                                                |
| Pluralization      | `count === 1 ? 'item' : 'items'` | ICU plural syntax in message files        | Hindi/Marathi/Gujarati have different plural rules than English                     |
| Number formatting  | `toLocaleString()` calls         | next-intl formatNumber                    | Consistent formatting across server/client                                          |
| SSL certificates   | Self-signed certs                | Let's Encrypt via Certbot                 | Free, auto-renewable, trusted by all browsers                                       |
| Process management | systemd service files            | PM2                                       | Auto-restart, zero-downtime reload, log management                                  |
| Reverse proxy      | Direct Node.js port exposure     | Nginx                                     | SSL termination, security headers, static file caching                              |

**Key insight:** Indian languages have complex plural rules (Hindi has two categories: one and other; Gujarati has the same). ICU MessageFormat in next-intl handles this correctly out of the box -- never hand-roll pluralization logic.

## Common Pitfalls

### Pitfall 1: Font Not Supporting Target Scripts

**What goes wrong:** Hindi/Marathi/Gujarati text appears as tofu (empty rectangles) or falls back to system fonts with inconsistent styling.
**Why it happens:** The Inter font currently used only supports Latin, Cyrillic, Greek, and Vietnamese scripts. It has NO Devanagari or Gujarati support.
**How to avoid:** Switch from Inter to Noto Sans family. Load Noto Sans (Latin), Noto Sans Devanagari, and Noto Sans Gujarati via `next/font/google`. Apply the correct font-family based on the `lang` attribute.
**Warning signs:** Any non-Latin text in Hindi/Marathi/Gujarati renders differently from the rest of the UI.

### Pitfall 2: Cookie-Based Locale Not Persisting After Refresh

**What goes wrong:** User selects a language, but after navigating or refreshing, the app reverts to English.
**Why it happens:** The cookie is set with wrong path, missing `max-age`, or the `request.ts` file doesn't read the cookie correctly.
**How to avoid:** Set cookie with `path=/` and `max-age=31536000` (1 year). Verify `request.ts` reads `cookies().get('NEXT_LOCALE')` correctly. Test with browser dev tools.
**Warning signs:** Language reverts to default after page navigation or browser restart.

### Pitfall 3: Translation Keys Missing in Non-English Locales

**What goes wrong:** Some UI labels appear as raw translation keys (e.g., `Dashboard.complianceHealth`) in Hindi/Marathi/Gujarati.
**Why it happens:** Translation files are incomplete -- keys exist in en.json but are missing from hi.json, mr.json, or gu.json.
**How to avoid:** Use a script or manual check to verify all keys in en.json exist in every other locale file. next-intl can be configured to fall back to English for missing keys (use `defaultTranslationValues` or `onError` handler).
**Warning signs:** Mixed English and translated text on a single screen.

### Pitfall 4: Banking Terminology Mistranslation

**What goes wrong:** Domain-specific terms like "CRAR", "NPA", "DAKSH score", or "Prompt Corrective Action" are translated literally or incorrectly.
**Why it happens:** Generic translation tools don't understand RBI/banking domain. Many banking acronyms should remain in English even in Indian language UIs.
**How to avoid:** Keep RBI acronyms (CRAR, NPA, CRR, SLR, KYC, AML, DAKSH, PCA) in English across all locales. Use the RBI's official Shabdavali (banking glossary at shabdavali.rbi.org.in) for Hindi terms. For Marathi and Gujarati, use standard banking terminology from RBI trilingual communications.
**Warning signs:** Domain experts reject translations as "unnatural" or "not how banks actually talk."

### Pitfall 5: Tables/Charts Breaking on Mobile

**What goes wrong:** Data tables with many columns cause horizontal scrolling. Charts render too small to read.
**Why it happens:** Desktop-optimized layouts don't adapt gracefully to narrow viewports.
**How to avoid:** Use `overflow-x-auto` on table containers. Consider card-based layouts for mobile views of table data. Set minimum widths on chart containers. Use Tailwind's responsive prefixes (`md:`, `lg:`) to show/hide columns.
**Warning signs:** Horizontal scrollbar appears on any mobile screen.

### Pitfall 6: PM2 Process Not Surviving Server Reboot

**What goes wrong:** After a server restart, the Next.js app doesn't auto-start.
**Why it happens:** PM2 startup script wasn't configured.
**How to avoid:** Run `pm2 startup systemd` and `pm2 save` after starting the app.
**Warning signs:** App is down after scheduled or unscheduled server reboot.

### Pitfall 7: SSL Certificate Renewal Failure

**What goes wrong:** SSL certificate expires after 90 days, site shows security warning.
**Why it happens:** Certbot auto-renewal cron job wasn't set up or fails silently.
**How to avoid:** Run `sudo certbot renew --dry-run` to verify auto-renewal works. Set up a cron job: `0 0,12 * * * certbot renew --quiet`.
**Warning signs:** Site works for ~3 months then shows SSL warning.

### Pitfall 8: Next.js 16 Middleware Renamed to Proxy

**What goes wrong:** Creating `middleware.ts` for next-intl doesn't work in Next.js 16.
**Why it happens:** Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported function to `proxy`.
**How to avoid:** For the "without i18n routing" approach, NO proxy.ts is needed at all. If routing-based i18n is used (not recommended for this project), use `proxy.ts` instead of `middleware.ts`.
**Warning signs:** Middleware-related console warnings from Next.js 16.

## Code Examples

### Complete i18n Setup (Without Routing)

```typescript
// src/i18n/request.ts
// Source: https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const SUPPORTED_LOCALES = ["en", "hi", "mr", "gu"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];

function isValidLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}

export default getRequestConfig(async () => {
  const store = await cookies();
  const raw = store.get("NEXT_LOCALE")?.value || "en";
  const locale = isValidLocale(raw) ? raw : "en";

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

### Root Layout with i18n Provider and Multi-Script Fonts

```typescript
// src/app/layout.tsx
import type { Metadata } from 'next';
import { Noto_Sans, Noto_Sans_Devanagari, Noto_Sans_Gujarati } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-noto-sans',
  display: 'swap',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  variable: '--font-noto-devanagari',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const notoGujarati = Noto_Sans_Gujarati({
  subsets: ['gujarati'],
  variable: '--font-noto-gujarati',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'AEGIS - Audit & Compliance Platform',
  description: 'Internal Audit & RBI Compliance Management for Urban Cooperative Banks',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${notoSans.variable} ${notoDevanagari.variable} ${notoGujarati.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

### Using Translations in Components

```typescript
// Server Component (async)
import { getTranslations } from 'next-intl/server';

export default async function DashboardPage() {
  const t = await getTranslations('Dashboard');
  return <h1>{t('complianceHealth')}</h1>;
}

// Client Component
'use client';
import { useTranslations } from 'next-intl';

export function ComplianceTable() {
  const t = useTranslations('Compliance');
  return <th>{t('requirementId')}</th>;
}
```

### Nginx Configuration for Next.js

```nginx
# /etc/nginx/sites-available/aegis
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Cache Next.js static assets
    location /_next/static/ {
        proxy_pass http://localhost:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

### PM2 Ecosystem Config

```javascript
// ecosystem.config.js (on the server)
module.exports = {
  apps: [
    {
      name: "aegis",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/home/ubuntu/aegis",
      instances: 1,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
```

## State of the Art

| Old Approach         | Current Approach               | When Changed       | Impact                                                               |
| -------------------- | ------------------------------ | ------------------ | -------------------------------------------------------------------- |
| middleware.ts        | proxy.ts                       | Next.js 16 (2025)  | File renamed; exported function renamed from `middleware` to `proxy` |
| next-intl v3         | next-intl v4                   | Late 2025          | ESM-only, session cookies by default, simplified provider setup      |
| Manual locale cookie | Automatic cookie via next-intl | next-intl 4.0      | GDPR-compliant session cookies; only set when user switches locale   |
| Tailwind v3 config   | Tailwind v4 @theme             | Tailwind v4 (2025) | Breakpoints via `--breakpoint-*` CSS variables in `@theme`           |
| react-intl           | next-intl                      | 2023+              | next-intl is purpose-built for Next.js App Router with RSC support   |

**Deprecated/outdated:**

- `middleware.ts` in Next.js 16 -- renamed to `proxy.ts` (but not needed for this project's i18n approach)
- next-intl v3 `locale` argument in `getRequestConfig` -- use `await requestLocale` (v3.22+) or just `cookies()` (without routing)
- CommonJS imports of next-intl -- v4 is ESM-only

## Open Questions

1. **Exact Noto Sans font weight availability**
   - What we know: Noto Sans Devanagari and Gujarati are available on Google Fonts with multiple weights
   - What's unclear: Whether all weights (400, 500, 600, 700) match exactly with Noto Sans Latin
   - Recommendation: Test font rendering during implementation; adjust weights if visual mismatch occurs

2. **Banking terminology accuracy for Marathi and Gujarati**
   - What we know: RBI's Shabdavali glossary (shabdavali.rbi.org.in) only covers English-Hindi. No official Marathi/Gujarati banking glossary exists.
   - What's unclear: Standard Marathi/Gujarati banking terminology for terms like "Compliance Registry", "Audit Finding", "Board Report"
   - Recommendation: Keep RBI acronyms in English (CRAR, NPA, PCA, DAKSH). For generic terms, use standard Marathi/Gujarati words. Flag I18N-03 (banking terminology verification) as requiring domain expert review post-implementation.

3. **Domain name for demo deployment**
   - What we know: App deploys to AWS Lightsail Mumbai (ap-south-1)
   - What's unclear: Whether a custom domain is already registered
   - Recommendation: Plan should support both IP-based access and custom domain. SSL can be added after domain is configured. Use Lightsail's static IP initially.

4. **Demo script content**
   - What we know: 15-min and 30-min demo scripts are needed
   - What's unclear: Exact demo flow, talking points, audience (bank CEO? IT head?)
   - Recommendation: Plan should create markdown-based demo scripts with screen-by-screen flows. This is content work, not code.

## Responsive Design Considerations

### Tailwind CSS v4 Breakpoints (Default)

| Prefix | Min Width | Target                       |
| ------ | --------- | ---------------------------- |
| (none) | 0px       | Mobile (default)             |
| `sm`   | 640px     | Large phones / small tablets |
| `md`   | 768px     | Tablets                      |
| `lg`   | 1024px    | Laptops                      |
| `xl`   | 1280px    | Desktops                     |

### Key Responsive Patterns for AEGIS

1. **Sidebar:** Already uses shadcn/ui `SidebarProvider` with `collapsible="icon"` -- collapses to hamburger on mobile via `SidebarTrigger`
2. **Tables:** Wrap in `overflow-x-auto` container. On mobile, consider hiding low-priority columns with `hidden md:table-cell`
3. **Dashboard widgets:** Use `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4` for responsive card grids
4. **Charts:** Set `min-h-[200px]` and use `ResponsiveContainer` from Recharts
5. **Touch targets:** Minimum 44x44px tap targets (WCAG). shadcn/ui buttons with `size="sm"` may be too small on mobile -- use `size="default"` or add `min-h-11 min-w-11` for touch devices
6. **Padding:** Use `p-4 md:p-6` pattern (tighter on mobile, more spacious on desktop)
7. **Typography:** Base text `text-sm md:text-base` for body content

### Mobile-First Approach

Start with mobile layout (unprefixed utilities), then add breakpoint prefixes for larger screens. This is Tailwind's default philosophy and should be followed consistently.

## Sources

### Primary (HIGH confidence)

- [next-intl App Router Setup](https://next-intl.dev/docs/getting-started/app-router) -- Installation, configuration, component usage
- [next-intl Without i18n Routing](https://next-intl.dev/docs/getting-started/app-router/without-i18n-routing) -- Cookie-based locale without URL prefixes
- [next-intl Routing Configuration](https://next-intl.dev/docs/routing/configuration) -- localePrefix options, cookie settings
- [next-intl 4.0 Blog](https://next-intl.dev/blog/next-intl-4-0) -- Breaking changes, migration notes
- [next-intl Server/Client Components](https://next-intl.dev/docs/environments/server-client-components) -- useTranslations, getTranslations, NextIntlClientProvider
- [next-intl Translation Rendering](https://next-intl.dev/docs/usage/translations) -- Message format, namespaces, pluralization, rich text
- [Tailwind CSS v4 Responsive Design](https://tailwindcss.com/docs/responsive-design) -- Breakpoints, mobile-first, container queries
- [AWS Lightsail SSL with Nginx](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-using-lets-encrypt-certificates-with-nginx.html) -- Certbot setup on Lightsail
- [next-intl Middleware/Proxy](https://next-intl.dev/docs/routing/middleware) -- proxy.ts naming in Next.js 16

### Secondary (MEDIUM confidence)

- [Next.js deployment with PM2 + Nginx + Certbot](https://dev.to/j3rry320/deploy-your-nextjs-app-like-a-pro-a-step-by-step-guide-using-nginx-pm2-certbot-and-git-on-your-linux-server-3286) -- Deployment commands and config
- [AWS Lightsail Pricing](https://aws.amazon.com/lightsail/pricing/) -- $5/month for 1 vCPU, 0.5 GB RAM
- [Noto Sans Devanagari on Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari) -- Font availability
- [Noto Sans Gujarati on Google Fonts](https://fonts.google.com/noto/specimen/Noto+Sans+Gujarati) -- Font availability
- [RBI Shabdavali](https://shabdavali.rbi.org.in/) -- Official RBI banking glossary (English-Hindi only)

### Tertiary (LOW confidence)

- Banking terminology for Marathi and Gujarati -- No authoritative source found; needs domain expert validation

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- next-intl is the established standard for Next.js i18n; PM2+Nginx is standard for Node.js deployment
- Architecture (i18n): HIGH -- "Without routing" approach documented in official next-intl docs
- Architecture (deployment): HIGH -- AWS Lightsail Mumbai + Nginx + PM2 is well-documented
- Font handling: MEDIUM -- Noto Sans family approach is sound but exact rendering quality needs testing
- Banking translations: LOW -- No authoritative glossary for Marathi/Gujarati banking terms; requires domain expert review
- Responsive design: HIGH -- Tailwind v4 responsive utilities are well-documented; shadcn/ui has built-in mobile patterns
- Pitfalls: HIGH -- Based on official documentation and community discussions

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days; stable domain)
