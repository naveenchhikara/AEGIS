# Phase 1: Project Setup & Demo Data - Context

**Gathered:** February 7, 2026
**Status:** Ready for planning

## Phase Boundary

Initialize Next.js 14 project with TypeScript, Tailwind CSS, and shadcn/ui. Create app shell with sidebar navigation and login screen. Prepare all demo data files for Sahyadri UCB including bank profile, RBI compliance requirements, audit plans, findings, and compliance calendar. Catalogue RBI circular PDFs and document common RBI observations.

## Implementation Decisions

### Tech Stack
- Next.js 14 with App Router (not Pages Router)
- TypeScript for type safety
- Tailwind CSS for styling
- shadcn/ui for pre-built components (not building from scratch)
- ESLint + Prettier for code quality

### Project Structure
- `/src/app` - Next.js app router pages
- `/src/components` - Reusable UI components
- `/src/lib` - Utility functions and configurations
- `/src/data` - All JSON demo data files
- `/public` - Static assets (logos, images)

### Navigation Structure
- Left sidebar with 7 menu items: Dashboard, Compliance Registry, Audit Plan, Findings, Board Report, Auditee Portal (placeholder), Settings (placeholder)
- Top bar with: logo, language switcher, notifications bell, user profile dropdown
- Sidebar collapses to hamburger menu on mobile
- Active route highlighted in sidebar

### Login Screen
- Clean, centered login card
- Fields: email, password (both functional-looking but no real auth)
- MFA prompt UI (visual only — "Enter code from authenticator app")
- Language selector dropdown (EN/HI/MR/GU) prominent on login
- Logo placeholder at top
- "Login" button redirects to dashboard on any valid email format
- No "forgot password" or "sign up" (internal tool)

### Demo Data Format
- JSON files in `/src/data` directory
- Each file has consistent structure with `id`, `name`, `status`, `createdAt` fields
- All dates in ISO format
- Relationships use IDs (foreign keys)
- Sahyadri UCB as reference bank

### RBI Circulars Processing
- Store PDFs in `/Project Doc/rbi-circulars/`
- Create index document mapping circulars to compliance requirements
- Extract requirements into structured JSON with categories
- Document common observations as finding templates

### Claude's Discretion
- Exact component file structure within `/src/components`
- Tailwind config values (colors, spacing)
- shadcn/ui components to install upfront vs. as needed
- JSON file naming conventions
- Routing strategy (app directory structure)

## Specific Ideas

- Use similar navigation pattern to Vercel's dashboard — clean sidebar with collapsible sections
- Login should feel enterprise — professional colors, not playful
- For demo data, make it realistic — actual bank names, plausible compliance requirements
- Language switcher should be a globe icon + current language code

## Deferred Ideas

- Real authentication with NextAuth.js — Phase 2 (MVP)
- Multi-tenant data structures — Phase 2 (MVP)
- Role-based navigation differences — deferred to MVP based on pilot feedback

---

*Phase: 01-project-setup*
*Context gathered: February 7, 2026*
