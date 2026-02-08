# AGENTS.md - AEGIS Platform Development Guide

**Last Updated:** February 7, 2026

Guidelines for agentic coding agents on the AEGIS UCB Audit & Compliance Platform.

---

## Commands

### Development

```bash
pnpm dev              # Start dev server (http://localhost:3000)
pnpm build            # Production build
pnpm start            # Start production server
```

### Code Quality

```bash
pnpm lint             # Run ESLint
prettier --write .    # Format all files
```

### Testing

**Note:** No test framework configured yet. When adding tests, use Jest or Vitest:

- Run single test: `pnpm test -- path/to/test.test.ts`
- Run all tests: `pnpm test`

---

## Code Style Guidelines

### Imports

- Use `@/*` path aliases (`@/*` → `./src/*`)
- Group: React → Third-party → Internal → Types
- Re-export icons from `@/lib/icons`

```typescript
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import type { ButtonProps } from "@/components/ui/button";
```

### Formatting (Prettier)

- **Semicolons:** Enabled | **Quotes:** Double quotes
- **Plugin:** `prettier-plugin-tailwindcss` (auto-sorts Tailwind classes)
- **Max line length:** 80-100 characters preferred

### TypeScript

- **Strict mode:** Enabled | **Target:** ES2017 | **Module:** ESNext
- Export all types from `src/types/index.ts`
- Use `type` keyword for type-only exports: `export type { MyType }`
- Prefer `interface` for extensible objects, `type` for unions/primitives

### Naming Conventions

- **Components:** PascalCase | **Functions:** camelCase | **Constants:** UPPER_SNAKE_CASE
- **Files:** kebab-case | **Enums/Tuples:** PascalCase | **Booleans:** `is/has/should` prefix

### Date Format

- **Use ISO 8601 strings** (not Date objects): `YYYY-MM-DD` or `YYYY-MM-DDTHH:mm:ss.sssZ`

### Component Patterns

```typescript
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button" // Required for DevTools
```

### Class Names

- Always use `cn()` utility from `@/lib/utils`
- Combines `clsx` and `tailwind-merge`; Tailwind classes auto-sorted by Prettier
- `className={cn("base classes", isActive && "conditional", customClassName)}`

### Error Handling

- For prototype/demo phase, minimal error handling acceptable
- When adding: Use try/catch for async, provide user-friendly messages, log to console

### File Organization

```
src/
├── app/                 # Next.js App Router pages (auth, dashboard)
├── components/
│   ├── ui/             # shadcn/ui components
│   ├── layout/         # Layout components
│   └── auth/           # Auth components
├── data/
│   ├── demo/           # Demo data JSON files
│   └── rbi-regulations/ # RBI knowledge base
├── lib/                # Utilities, helpers
├── hooks/              # React hooks
└── types/              # TypeScript types
```

### React Patterns

- Use Server Components by default (no `use client` unless needed)
- Use Client Components for interactivity (state, events, browser APIs)
- Keep components under 150 lines; extract logic to custom hooks
- Add JSDoc for complex functions; section headers for major blocks

### Tailwind CSS v4

- Native CSS variables for theming (`app/globals.css`)
- Access via CSS variables: `hsl(var(--primary))`
- Dark mode support via `.dark` class

---

## Project-Specific Notes

### Demo Data

- Store in `src/data/demo/*.json`, export from `src/data/index.ts`
- Use realistic UCB context (Tier 2 Maharashtra bank)
- Findings based on common RBI observations (CRAR, ALM, cyber issues)

### RBI Regulations

- Knowledge base in `src/data/rbi-regulations/`
- Tag requirements by UCB tier (Tier 1, 2, 3/4, All)
- Map all requirements to specific RBI circular references

### Multi-Language Support (Phase 4)

- Target: English, Hindi, Marathi, Gujarati
- Banking terminology must be verified by domain expert

---

## Quick Reference

### Path Aliases

```typescript
@/components/ui/*     // shadcn/ui components
@/components/layout/* // Layout components
@/lib/*              // Utilities (cn, icons, helpers)
@/types/*            // Type definitions
@/data/*             // Demo data and regulations
```

### Common Imports

```typescript
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UserIcon } from "@/lib/icons";
import type { BankProfile } from "@/types";
```

---

## Before Committing

1. Run `pnpm lint` to check for ESLint errors
2. Run `pnpm build` to verify production build works
3. Test your changes in browser (`pnpm dev`)
4. Verify demo data loads correctly
5. Ensure no console errors

---

_This guide is maintained for agentic coding assistants. Update as project evolves._
