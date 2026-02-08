# Technology Stack

**Analysis Date:** 2026-02-08

## Languages

**Primary:**

- TypeScript 5.9.3 - All application code (77 `.ts`/`.tsx` files in `src/`)
- Strict mode enabled (`tsconfig.json`)

**Secondary:**

- JavaScript (ESM) - Configuration files (`next.config.ts`, `tailwind.config.ts`, `postcss.config.js`)
- CSS - Tailwind v4 with `@theme inline` directive in `src/app/globals.css`
- JSON - Demo data files (55+ JSON files in `src/data/demo/` and `src/data/rbi-regulations/`)

## Runtime

**Environment:**

- Node.js v25.6.0 (detected in development)
- Target: ES2017 (`tsconfig.json`)

**Package Manager:**

- pnpm 10.28.2
- Lockfile: `package-lock.json` also present (npm was used previously)
- Install command: `pnpm install`

## Frameworks

**Core:**

- Next.js 16.1.6 - App Router with React Server Components
- React 19.2.4 - Latest React with Server Components
- React DOM 19.2.4

**Internationalization:**

- next-intl 4.8.2 - Multi-language support (en, hi, mr, gu)
- Config: `src/i18n/request.ts` with locale stored in `NEXT_LOCALE` cookie
- Message files: `messages/{en,hi,mr,gu}.json`

**Build/Dev:**

- Turbopack - Bundler (`pnpm dev` runs `next dev --turbopack`)
- TypeScript 5.9.3 - Compiler with Next.js plugin
- ESLint 10.0.0 - Linting with `next/core-web-vitals` and `next/typescript` configs
- Prettier 3.8.1 - Code formatting with `prettier-plugin-tailwindcss`

**Testing:**

- Not detected

## Key Dependencies

**UI Framework:**

- @radix-ui/\* (12 packages) - Headless UI primitives (Avatar, Dialog, Dropdown, Select, Tabs, etc.)
- shadcn/ui pattern - Component composition via `components.json` (new-york style)
- lucide-react 0.563.0 - Icon library (imported via `@/lib/icons` barrel export)

**Styling:**

- Tailwind CSS 4.1.18 - Utility-first CSS framework
- @tailwindcss/postcss 4.1.18 - PostCSS plugin
- tailwindcss-animate 1.0.7 - Animation utilities
- tailwind-merge 3.4.0 - Merge utility classes
- class-variance-authority 0.7.1 - Variant API for component styles

**Data & Tables:**

- @tanstack/react-table 8.21.3 - Table state management
- recharts 3.7.0 - Chart library (donut charts, area charts, bar charts)

**Utilities:**

- clsx 2.1.1 - Conditional classNames
- react-is 19.2.4 - React element type checking

**Fonts:**

- next/font/google - Google Fonts loader
  - Noto Sans (Latin)
  - Noto Sans Devanagari (Hindi)
  - Noto Sans Gujarati (Gujarati)
  - DM Serif Display (headings)

## Configuration

**Environment:**

- No `.env` files detected
- No `process.env` or `NEXT_PUBLIC_` variables used
- Locale stored in cookie (`NEXT_LOCALE`)
- Pure client-side prototype with JSON data

**Build:**

- `next.config.ts` - Next.js config with `next-intl/plugin`
- `tsconfig.json` - TypeScript config with `@/*` path alias to `./src/*`
- `tailwind.config.ts` - Tailwind theme with shadcn color tokens
- `postcss.config.js` - PostCSS with Tailwind and Autoprefixer
- `components.json` - shadcn/ui CLI config (new-york style, lucide icons, CSS variables)
- `eslint.config.mjs` - ESLint flat config with Next.js presets
- `.prettierrc` - Prettier config (semi: true, singleQuote: false, Tailwind plugin)

**TypeScript:**

- Path aliases: `@/*` → `./src/*`
- Module resolution: `bundler`
- JSON imports enabled (`resolveJsonModule: true`)
- JSX runtime: `react-jsx`

## Platform Requirements

**Development:**

- Node.js 20+ (recommended in README, v25.6.0 in use)
- pnpm 9+ (README requirement, v10.28.2 in use)
- Port 3000 (default Next.js dev server)

**Production:**

- Target deployment: AWS Mumbai (ap-south-1) for RBI data localization
- Build command: `pnpm build`
- Start command: `pnpm start`
- No Docker configuration detected
- No CI/CD configuration detected (.github/workflows not present)

---

_Stack analysis: 2026-02-08_
