# Plan 02: Stored XSS Fix — documentUrl Protocol Validation

---

wave: 1
depends_on: []
files_modified:

- src/actions/governance/manage-policy.ts
- src/components/governance/policy-table.tsx
  autonomous: true
  requirements: []

---

## Objective

Fix stored XSS vulnerability where `documentUrl` in policy management accepts arbitrary strings including `javascript:` and `data:` protocols, which execute when users click the document link.

## Context

The `documentUrl` field on `PolicyDocument` is stored via `manage-policy.ts` server action and rendered as a raw `<a href={policy.documentUrl}>` in `policy-table.tsx`. The Zod schema uses bare `z.string().optional()` without URL or protocol validation. An attacker with `policy:manage` permission can store `javascript:alert(document.cookie)` and it executes when any user clicks the link icon.

## Tasks

<task id="2.1">
**Server-side fix: Validate documentUrl in manage-policy.ts Zod schema**

In `src/actions/governance/manage-policy.ts` (~line 32), update the `ManagePolicySchema`:

```typescript
// Before:
documentUrl: z.string().optional(),

// After:
documentUrl: z
  .string()
  .url("Must be a valid URL")
  .refine(
    (val) => /^https?:\/\//i.test(val),
    { message: "URL must start with https:// or http://" }
  )
  .optional()
  .or(z.literal("")),
```

The `.or(z.literal(""))` allows clearing the field. The `.url()` validates URL structure. The `.refine()` ensures only http/https protocols are accepted — blocking `javascript:`, `data:`, `vbscript:`, `blob:`, etc.
</task>

<task id="2.2">
**Client-side fix: Validate documentUrl in policy-table.tsx form schema**

In `src/components/governance/policy-table.tsx` (~line 83), update the `policySchema`:

```typescript
// Before:
documentUrl: z.string().optional(),

// After:
documentUrl: z
  .string()
  .url("Must be a valid URL")
  .refine(
    (val) => /^https?:\/\//i.test(val),
    { message: "URL must start with https:// or http://" }
  )
  .optional()
  .or(z.literal("")),
```

Also add `type="url"` to the `<Input>` component (~line 332) for browser-native URL validation:

```tsx
<Input
  id="documentUrl"
  type="url"
  {...form.register("documentUrl")}
  placeholder="https://..."
/>
```

</task>

<task id="2.3">
**Render-side guard: Sanitize href in policy-table.tsx**

In `src/components/governance/policy-table.tsx` (~line 441-450), add a protocol check before rendering the link. This is defense-in-depth for any existing bad data in the database:

```tsx
// Before:
{policy.documentUrl && (
  <Button size="sm" variant="ghost" asChild>
    <a href={policy.documentUrl} target="_blank" rel="noopener noreferrer">

// After:
{policy.documentUrl && /^https?:\/\//i.test(policy.documentUrl) && (
  <Button size="sm" variant="ghost" asChild>
    <a href={policy.documentUrl} target="_blank" rel="noopener noreferrer">
```

This ensures that even if bad data exists in the DB from before the fix, it won't be rendered as a clickable link.
</task>

<task id="2.4">
**Verify: TypeScript compiles, form works**

1. Run `pnpm tsc --noEmit`
2. Manually verify the form rejects `javascript:alert(1)` as input
3. Verify valid URLs like `https://example.com/policy.pdf` are accepted
4. Verify empty string / clearing the field works
   </task>

## Verification Criteria

- [ ] Server action rejects `javascript:`, `data:`, `vbscript:` protocols
- [ ] Server action accepts `https://` and `http://` URLs
- [ ] Client form shows validation error for non-http URLs
- [ ] Render guard prevents bad existing data from creating clickable XSS links
- [ ] `pnpm tsc --noEmit` passes

## must_haves

- documentUrl Zod validation rejects javascript: protocol at server action level
- documentUrl Zod validation rejects javascript: protocol at client form level
- Render-side guard prevents existing bad data from executing as XSS
- Empty/cleared documentUrl still works
