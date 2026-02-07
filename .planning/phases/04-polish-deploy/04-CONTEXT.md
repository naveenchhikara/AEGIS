# Phase 4: Polish & Deploy - Context

**Gathered:** February 7, 2026
**Status:** Ready for planning

## Phase Boundary

Add multi-language support for English, Hindi, Marathi, and Gujarati using next-intl. Implement responsive design polish including print stylesheets for board reports. Deploy the clickable prototype to AWS Lightsail Mumbai region with SSL certificate and custom domain. Prepare demo scripts for client presentations.

## Implementation Decisions

### i18n Framework
- **next-intl 3.x** - Only viable option for Next.js 14 App Router
- next-i18next is NOT compatible with App Router
- Prefix-based routing: `/en/dashboard`, `/hi/dashboard`, etc.
- Middleware-based locale negotiation
- Cookie-based language persistence

### Supported Languages
- **English (en)** - Default locale
- **Hindi (hi)** - Devanagari script
- **Marathi (mr)** - Devanagari script
- **Gujarati (gu)** - Gujarati script

### Project Structure Changes
```
src/
├── app/
│   ├── [locale]/           # NEW: Locale wrapper for all routes
│   │   ├── layout.tsx      # Modified: Accept locale param
│   │   ├── page.tsx        # Dashboard
│   │   ├── compliance/     # All existing pages move here
│   │   ├── audit-plan/
│   │   ├── findings/
│   │   └── report/
│   └── globals.css
├── components/
│   ├── LanguageSwitcher.tsx  # NEW: Globe icon + dropdown
│   └── MobileSidebar.tsx     # NEW: Sheet component for mobile
├── i18n/                    # NEW: Internationalization
│   ├── config.ts
│   ├── request.ts
│   └── locales/
│       ├── en/common.json
│       ├── hi/common.json
│       ├── mr/common.json
│       └── gu/common.json
└── middleware.ts            # NEW: Locale negotiation
```

### Translation Requirements
- All UI labels must have translations
- Banking terminology must be verified by domain expert
- Navigation, buttons, tables, status badges all translatable
- Date formats respect locale conventions

### AWS Deployment Stack
- **AWS Lightsail** - Ubuntu 22.04 LTS in Mumbai (ap-south-1)
- **PM2** - Process manager with cluster mode (2 instances)
- **Nginx** - Reverse proxy with SSL termination
- **Let's Encrypt (Certbot)** - Free SSL with auto-renewal
- **Node.js 20 LTS** - Runtime environment

### Responsive Design Standards
- Breakpoint: md (768px) for tablet, lg (1024px) for desktop
- Minimum touch target: 44x44 pixels
- Sidebar collapses to hamburger menu on mobile (< 768px)
- Tables use horizontal scroll on mobile
- No horizontal scrolling on any screen size

### Print Stylesheet
- A4 page size with 15mm margins
- Hide navigation, sidebar, language switcher
- Page breaks before major sections
- Avoid breaks inside cards/findings
- Print link URLs after text

### Demo Scripts
- **15-minute version**: Quick overview for busy CEOs
- **30-minute version**: Detailed walkthrough with Q&A
- Focus on: compliance coverage, audit visibility, risk tracking

## Claude's Discretion
- Exact translations for HI/MR/GU (provide English base, AI generates drafts for review)
- PM2 instance count (2 for 2-core server, adjust based on actual specs)
- Nginx cache settings
- Demo script wording and flow

## Specific Ideas
- Use Globe icon from lucide-react for language switcher
- Sheet component from shadcn/ui provides smooth mobile menu animation
- Store language preference in localStorage AND cookie for belt-and-suspenders
- Print preview button opens browser print dialog with pre-configured styles

## Deferred Ideas
- Professional translation services - MVP uses internal review, production engages certified BFSI translators
- Real PDF generation - Phase uses browser print-to-PDF
- CDN for static assets - Keep on Lightsail for simplicity
- Multi-region deployment - Mumbai only for initial demo

---

*Phase: 04-polish-deploy*
*Context gathered: February 7, 2026*
