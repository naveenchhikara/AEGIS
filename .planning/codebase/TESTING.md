# Testing Patterns

**Analysis Date:** 2026-02-08

## Test Framework

**Runner:**

- None configured

**Assertion Library:**

- None configured

**Run Commands:**

```bash
# No test commands in package.json
```

## Test File Organization

**Location:**

- No test files present in `src/` directory

**Naming:**

- Not applicable (no tests)

**Structure:**

```
Not applicable
```

## Test Structure

**Suite Organization:**
Not applicable (no test suite configured)

**Patterns:**
No testing patterns established

## Mocking

**Framework:** Not configured

**Patterns:**
Not applicable (no tests)

**What to Mock:**
Future considerations for AEGIS:

- Demo data JSON imports (`@/data`)
- `next-intl` translation hooks
- Next.js router hooks (`useRouter`, `usePathname`)
- `@tanstack/react-table` hooks

**What NOT to Mock:**

- Pure utility functions (`formatDate`, `cn`)
- TypeScript types and constants

## Fixtures and Factories

**Test Data:**

- Current demo data in `src/data/demo/*.json` could serve as test fixtures
- Consider extracting to shared test fixtures if testing is added

**Location:**

- Demo data: `src/data/demo/`
- Future test fixtures: Consider `src/__tests__/fixtures/` or `src/test-utils/`

## Coverage

**Requirements:** None enforced

**View Coverage:**

```bash
# No coverage reporting configured
```

## Test Types

**Unit Tests:**

- Not present

**Integration Tests:**

- Not present

**E2E Tests:**

- Not present

## Common Patterns

**Async Testing:**
Not applicable (no tests)

**Error Testing:**
Not applicable (no tests)

## Recommendations for Future Testing

### Suggested Framework Setup

**For Component Testing:**

```bash
# Recommended: Vitest + React Testing Library
pnpm add -D vitest @vitejs/plugin-react
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
pnpm add -D jsdom
```

**For E2E Testing:**

```bash
# Recommended: Playwright (Next.js official recommendation)
pnpm add -D @playwright/test
```

### Priority Test Targets

**High Priority (Core Business Logic):**

1. `src/lib/utils.ts` — `formatDate()` function (Indian locale formatting)
2. `src/lib/report-utils.ts` — Report generation utilities (421 lines)
3. Table sorting/filtering logic in:
   - `src/components/compliance/compliance-table.tsx`
   - `src/components/findings/findings-table.tsx`

**Medium Priority (Component Behavior):**

1. Dashboard widgets (`src/components/dashboard/*`)
2. Filter components (`*-filters.tsx`)
3. Detail dialogs/sheets (`*-detail-dialog.tsx`, `*-detail-sheet.tsx`)

**Low Priority (UI Components):**

1. shadcn/ui primitives (`src/components/ui/*`) — Already tested by Radix UI
2. Layout components (`src/components/layout/*`) — Mostly presentational

### Testing Patterns to Establish

**For Data Tables:**

```typescript
// Test sorting behavior
describe("FindingsTable", () => {
  it("sorts findings by severity correctly", () => {
    // Verify critical > high > medium > low order
  });

  it("filters by status", () => {
    // Verify filter state updates table rows
  });
});
```

**For Utility Functions:**

```typescript
describe("formatDate", () => {
  it("formats dates in Indian locale", () => {
    expect(formatDate("2024-01-15", "short")).toBe("15 Jan 2024");
  });

  it("supports long format", () => {
    expect(formatDate("2024-01-15", "long")).toBe("15 January 2024");
  });
});
```

**For i18n Components:**

```typescript
// Mock next-intl translations
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
```

**For Next.js Router:**

```typescript
// Mock useRouter for navigation tests
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => "/dashboard",
}));
```

### Accessibility Testing

**Recommended Tool:**

```bash
pnpm add -D @axe-core/react
# Or for E2E:
pnpm add -D @axe-core/playwright
```

**Priority Areas:**

- Keyboard navigation in tables (already implemented, needs verification)
- ARIA labels on charts
- Focus management in dialogs
- Color contrast for status badges

### Visual Regression Testing

**For Design System Components:**

- Consider Chromatic or Percy for shadcn/ui customizations
- Focus on responsive breakpoints (mobile/tablet/desktop)

### Snapshot Testing

**Avoid for:**

- Large JSON data structures (unstable)
- Full page snapshots (fragile)

**Use for:**

- Small, stable components (badges, buttons)
- Formatted output strings

---

_Testing analysis: 2026-02-08_

**Note:** AEGIS is currently in prototype/demo phase with no backend or authentication. Testing infrastructure should be prioritized before Phase 5 (backend integration) to ensure reliability as the system moves toward production.
