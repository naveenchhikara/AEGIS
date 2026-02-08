# Phase 4: Polish & Deploy - Context

**Gathered:** February 8, 2026
**Status:** Ready for planning

<domain>
## Phase Boundary

Add multi-language support (Hindi, Marathi, Gujarati) to all UI and demo data, finalize responsive design across desktop/tablet/mobile, and deploy the prototype to AWS Lightsail Mumbai with SSL and custom domain. Includes creating demo scripts for client presentations.

</domain>

<decisions>
## Implementation Decisions

### Translation scope

- Translate EVERYTHING visible — UI labels, navigation, buttons, headings, AND all demo data (finding descriptions, audit names, compliance content, bank details)
- All 35 findings fully translated into Hindi, Marathi, and Gujarati (descriptions, root causes, action plans)
- Banking acronyms stay in English (CRAR, NPA, ALM, DAKSH, PCA) — these are industry-standard terms bankers know in English
- AI-generated translations (Claude/LLM) — acceptable quality for prototype demo, no professional translation service needed

### Language switcher UX

- Dropdown in top bar showing all 4 languages in their native script: English, हिन्दी, मराठी, ગુજરાતી
- Default language: English on first visit
- Smooth fade transition (200-300ms) when switching languages — no page reload, masks text reflow
- Language preference persisted via cookie — next visit loads in last-selected language

### Responsive design

- Primary demo target: Desktop/laptop (hero experience)
- Mobile/tablet: Polished responsive — thoughtful adapted layouts, not just "not broken"
- Charts on mobile: Simplified representations (e.g., progress bars instead of radial chart, numbers instead of donut) — faster loading, cleaner
- Findings table on mobile: Fewer columns (ID, Title, Severity) with tap-to-expand for full details — progressive disclosure pattern
- Known issue to fix: Findings table column clipping on narrow screens
- Touch targets: Upgrade to 44px minimum (WCAG recommended) from current 32px
- Board report print: Optimized for A4 paper size (standard in India)

### Deployment

- AWS Lightsail Mumbai (ap-south-1), Small instance ($5/mo, 1GB RAM, 1 vCPU)
- AWS account already exists — just provision the instance
- Custom domain will be provided later — plan for custom domain support
- SSL via Let's Encrypt (free, auto-renewing via Certbot)
- No access restriction — open to anyone with the URL
- Node.js + PM2 + Nginx stack

### Demo scripts

- Markdown docs with step-by-step instructions, screenshots, and talking points
- Two versions: 15-minute and 30-minute
- Language switching: brief mention, not a centerpiece — focus demo time on core audit/compliance features

### Claude's Discretion

- Multilingual print support for board report (whether Devanagari/Gujarati scripts print correctly in PDF)
- Specific chart simplification choices per widget on mobile
- Demo script structure and flow
- Noto Sans font family configuration for multi-script rendering
- next-intl configuration details

</decisions>

<specifics>
## Specific Ideas

- Language switcher shows native script names: English, हिन्दी, मराठी, ગુજરાતી
- Banking terms like CRAR, NPA, ALM always in English even when rest of UI is in Hindi/Marathi/Gujarati — bankers universally know these acronyms in English
- Fade transition on language switch gives a polished feel rather than jarring instant swap
- Progressive disclosure on mobile findings table (minimal columns + expand) rather than horizontal scroll

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 04-polish-deploy_
_Context gathered: February 8, 2026_
