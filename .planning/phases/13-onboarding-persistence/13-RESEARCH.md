# Phase 13: Onboarding Persistence & Excel Upload - Research

**Researched:** 2026-02-10
**Domain:** Server-side persistence, Excel file parsing, multi-step form state management
**Confidence:** HIGH

## Summary

Phase 13 adds server-side onboarding state persistence to PostgreSQL and Excel-based org structure upload. The codebase already has foundational pieces: Zustand store with localStorage, OnboardingProgress table, server actions, and exceljs dependency. The research validates that the existing architecture (Prisma upsert + JSON fields, Next.js server actions, exceljs for parsing) is production-ready.

**Key findings:**

1. **Existing infrastructure is sound** — OnboardingProgress table with JSON `stepData` field already exists; DAL pattern with `prismaForTenant` is established; server actions skeleton exists in `src/actions/onboarding.ts`
2. **ExcelJS is already installed** (v4.4.0) and is the best choice for Excel parsing — more actively maintained than SheetJS, better TypeScript support, handles streaming for large files
3. **Hybrid localStorage + PostgreSQL pattern** — Keep Zustand for instant UI updates, debounce server saves, merge on page load (server takes precedence)
4. **File upload security** — Use `file-type` library (already installed v21.3.0) for magic byte validation, combine with MIME type checks, configure `serverActions.bodySizeLimit` in next.config.ts

**Primary recommendation:** Build incremental save-on-blur + explicit "Save Progress" button. Use FormData + server action for Excel upload with multi-layer validation (extension, MIME type, magic bytes, exceljs parse attempt).

## Standard Stack

### Core

| Library       | Version | Purpose                         | Why Standard                                                                                                                                                     |
| ------------- | ------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **exceljs**   | 4.4.0   | Excel file parsing/generation   | Already installed; most actively maintained Excel library for Node.js; 248 Context7 code snippets; strong TypeScript support; supports streaming for large files |
| **file-type** | 21.3.0  | File validation via magic bytes | Already installed; industry standard for detecting true file type from binary signature; prevents MIME type spoofing attacks                                     |
| **Prisma**    | 7.3.0   | PostgreSQL ORM                  | Already in use; `upsert` operation perfect for save/resume pattern; JSON field support for flexible wizard state                                                 |
| **Zustand**   | 5.0.11  | Client-side state               | Already in use with localStorage persist middleware; proven pattern for multi-step forms                                                                         |
| **Zod**       | 4.3.6   | Validation                      | Already installed; standard for Next.js server action validation                                                                                                 |

### Supporting

| Library            | Version | Purpose              | When to Use                                             |
| ------------------ | ------- | -------------------- | ------------------------------------------------------- |
| **react-dropzone** | 14.4.0  | File upload UI       | Already installed; drag-and-drop Excel upload component |
| **next-intl**      | 4.8.2   | Internationalization | Already configured; error messages for file validation  |

### Alternatives Considered

| Instead of              | Could Use                  | Tradeoff                                                                                                                                                                                                   |
| ----------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| exceljs                 | SheetJS (xlsx)             | SheetJS more popular (4.2M weekly downloads vs 2.9M) but **less maintained**, security vulnerabilities reported, last npm publish 2018 (npm registry abandoned by maintainers), limited TypeScript support |
| exceljs                 | node-xlsx                  | Wrapper around SheetJS — inherits SheetJS maintenance issues                                                                                                                                               |
| file-type (magic bytes) | MIME type only             | MIME types easily spoofed; attackers can set arbitrary Content-Type headers                                                                                                                                |
| Prisma JSON field       | Separate normalized tables | JSON field simpler for wizard progress; normalized approach better for queryable data (we don't need to query step data, just load/save)                                                                   |

**Installation:** (All already installed)

```bash
pnpm add exceljs file-type zod
pnpm add -D @types/node
```

## Architecture Patterns

### Recommended Project Structure

```
src/
├── actions/
│   ├── onboarding.ts                    # Server actions (already exists)
│   └── onboarding-excel-upload.ts       # NEW: Excel parsing server action
├── data-access/
│   └── onboarding.ts                    # DAL functions (already exists)
├── stores/
│   └── onboarding-store.ts              # Zustand store (already exists)
├── app/(onboarding)/onboarding/
│   └── _components/
│       ├── step-4-org-structure.tsx     # Existing manual entry UI
│       └── excel-upload-button.tsx      # NEW: Excel upload component
└── lib/
    ├── excel-templates/
    │   └── org-structure-template.ts    # NEW: Template generation
    └── excel-parsers/
        └── org-structure-parser.ts      # NEW: Excel parsing logic
```

### Pattern 1: Hybrid localStorage + PostgreSQL State Management

**What:** Client state (Zustand + localStorage) provides instant feedback; server state (PostgreSQL) is source of truth. On page load, merge both with server taking precedence.

**When to use:** Multi-step forms where users expect instant UI updates but need cross-device/cross-browser persistence.

**Example:**

```typescript
// Source: AEGIS codebase pattern + research synthesis
// In Zustand store (already exists at src/stores/onboarding-store.ts)
export const useOnboardingStore = create<OnboardingState & OnboardingActions>()(
  persist(
    (set, get) => ({
      // ... existing store implementation
      saveToServer: async () => {
        const state = get();
        const response = await saveWizardStep(state.currentStep, {
          bankRegistration: state.bankRegistration,
          tierSelection: state.tierSelection,
          // ... other fields
        });
        if (response.success) {
          set({ lastSavedToServer: new Date().toISOString() });
        }
      },
    }),
    { name: "aegis-onboarding" },
  ),
);

// In page component - merge on mount
useEffect(() => {
  async function loadServerState() {
    const response = await getWizardProgress();
    if (response.success && response.data) {
      // Server state takes precedence
      useOnboardingStore.getState().setFromServerState(response.data);
    }
  }
  loadServerState();
}, []);

// Debounced auto-save (already implemented in step-4-org-structure.tsx)
const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const saveToStore = useCallback((data) => {
  if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  saveTimerRef.current = setTimeout(() => {
    store.setOrgStructure(data);
    store.saveToServer(); // NEW: trigger server save
  }, 500);
}, []);
```

### Pattern 2: Excel File Upload with Security Validation

**What:** Multi-layer file validation: extension check → MIME type → magic bytes → parse attempt. Only accept file if all layers pass.

**When to use:** Any user-uploaded file that will be processed server-side, especially binary formats like Excel.

**Example:**

```typescript
// Source: Research synthesis + file-type library docs
"use server";

import { fileTypeFromBuffer } from "file-type";
import ExcelJS from "exceljs";

export async function uploadOrgStructureExcel(formData: FormData) {
  const file = formData.get("excel") as File;

  // Layer 1: Extension check
  if (!file.name.endsWith(".xlsx")) {
    return { success: false, error: "Only .xlsx files are supported" };
  }

  // Layer 2: MIME type check
  if (
    file.type !==
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return { success: false, error: "Invalid file type" };
  }

  // Layer 3: Magic bytes validation
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileType = await fileTypeFromBuffer(buffer);

  if (
    !fileType ||
    fileType.mime !==
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return {
      success: false,
      error: "File content does not match .xlsx format",
    };
  }

  // Layer 4: Parse attempt (validates structure)
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet("Branches");
    if (!worksheet) {
      return { success: false, error: "Missing 'Branches' worksheet" };
    }

    // Extract and validate data...
    const branches = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header
      branches.push({
        name: row.getCell(1).value?.toString() || "",
        code: row.getCell(2).value?.toString() || "",
        city: row.getCell(3).value?.toString() || "",
        // ... other fields
      });
    });

    return { success: true, data: { branches } };
  } catch (error) {
    return { success: false, error: "Failed to parse Excel file" };
  }
}
```

### Pattern 3: Prisma Upsert for Save/Resume

**What:** Use Prisma's `upsert` operation to insert OnboardingProgress on first save, update on subsequent saves. Single operation handles both cases.

**When to use:** Forms that can be saved multiple times; creates-or-updates pattern; idempotent operations.

**Example:**

```typescript
// Source: Prisma docs + AEGIS existing pattern in src/data-access/onboarding.ts
export async function saveOnboardingProgress(
  tenantId: string,
  step: number,
  stepData: Record<string, unknown>,
) {
  return prisma.onboardingProgress.upsert({
    where: { tenantId }, // Unique constraint on tenantId
    create: {
      tenantId,
      currentStep: step,
      completedSteps: [step],
      stepData: stepData as Prisma.InputJsonValue,
      status: "in_progress",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      currentStep: step,
      completedSteps: { push: step }, // Append to array
      stepData: stepData as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
  });
}
```

### Pattern 4: Excel Template Generation

**What:** Generate Excel template with pre-defined headers, column widths, data validation rules. Users download template → fill data → upload.

**When to use:** Bulk data entry where spreadsheet UI is more efficient than web forms; when users already have data in spreadsheets.

**Example:**

```typescript
// Source: ExcelJS docs + research synthesis
import ExcelJS from "exceljs";

export async function generateOrgStructureTemplate() {
  const workbook = new ExcelJS.Workbook();

  // Branches worksheet
  const branchSheet = workbook.addWorksheet("Branches");
  branchSheet.columns = [
    { header: "Branch Name *", key: "name", width: 30 },
    { header: "Branch Code *", key: "code", width: 15 },
    { header: "City *", key: "city", width: 20 },
    { header: "State *", key: "state", width: 20 },
    { header: "Type *", key: "type", width: 20 },
    { header: "Manager Name", key: "managerName", width: 25 },
    { header: "Manager Email", key: "managerEmail", width: 30 },
  ];

  // Add data validation for Type column
  branchSheet
    .getColumn(5)
    .eachCell({ includeEmpty: true }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        // Skip header
        cell.dataValidation = {
          type: "list",
          allowBlank: false,
          formulae: ['"HO,Branch,Extension Counter"'],
          showErrorMessage: true,
          errorTitle: "Invalid Type",
          error: "Please select from dropdown",
        };
      }
    });

  // Style header row
  branchSheet.getRow(1).font = { bold: true };
  branchSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Add example row
  branchSheet.addRow({
    name: "Head Office",
    code: "HO",
    city: "Mumbai",
    state: "Maharashtra",
    type: "HO",
    managerName: "John Doe",
    managerEmail: "john@bank.com",
  });

  // Departments worksheet (similar pattern)
  const deptSheet = workbook.addWorksheet("Departments");
  // ... similar setup

  // Return buffer for download
  return await workbook.xlsx.writeBuffer();
}
```

### Anti-Patterns to Avoid

- **Trusting client-side file validation only:** Attackers can bypass client-side checks. Always validate server-side with magic bytes.
- **Loading entire Excel file into memory:** For large files (>1000 rows), use ExcelJS streaming reader to avoid memory issues.
- **Storing binary Excel files in PostgreSQL:** Store parsed data only. If you need to keep original file, use S3 and store S3 key in DB.
- **Not checking for duplicate codes:** Before inserting branches/departments, validate that codes are unique within the tenant.
- **Overwriting existing org structure:** If tenant already has branches/departments, prompt user: "Replace all?" vs "Merge/skip existing."

## Don't Hand-Roll

| Problem                          | Don't Build                       | Use Instead                          | Why                                                                                                                                                                           |
| -------------------------------- | --------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Excel parsing**                | Custom XML parser for XLSX        | exceljs                              | XLSX is a zip archive with XML files; 100+ edge cases (formulas, merged cells, styles, data validation, charts); exceljs handles all                                          |
| **File type detection**          | Regex on file extension           | file-type (magic bytes)              | Extensions trivially spoofed; magic bytes are first 12+ bytes of file, harder to forge; file-type checks 500+ formats                                                         |
| **Wizard state persistence**     | Custom localStorage serialization | Zustand persist middleware           | Handles hydration timing, SSR compatibility, storage versioning, partial rehydration; localStorage can fail (quota exceeded, private mode)                                    |
| **CSV vs Excel for bulk upload** | CSV parsing                       | Excel templates with data validation | Excel prevents user errors with dropdowns, required fields, type validation; CSV has no standard (commas in fields, encoding issues); Excel is expected format for bank users |

**Key insight:** Excel files are deceptively complex (zipped XML with relationships, shared strings, styles). ExcelJS has 10+ years of edge case handling. File type detection needs binary analysis — content-type headers are attacker-controlled.

## Common Pitfalls

### Pitfall 1: File Upload Size Limit Exceeded (Default 1MB)

**What goes wrong:** Users upload Excel files > 1MB (common for banks with 50+ branches), server action silently fails or returns generic error.

**Why it happens:** Next.js server actions have default 1MB body limit. Error message is vague: "Body exceeded 1mb limit."

**How to avoid:** Configure `serverActions.bodySizeLimit` in next.config.ts:

```typescript
// Source: Next.js docs + GitHub discussions
const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb", // Or "10mb" for large banks
      allowedOrigins: ["yourdomain.com"], // CSRF protection
    },
  },
};
```

**Warning signs:** File upload fails without clear error; works in development but fails in production; error logs show "Body exceeded 1mb limit."

### Pitfall 2: Excel File Has Different Structure Than Expected

**What goes wrong:** User downloads template, renames worksheets, reorders columns, or adds extra sheets. Parser fails or imports wrong data.

**Why it happens:** Users are familiar with Excel and assume flexibility. Parser expects exact worksheet names ("Branches") and column order.

**How to avoid:**

1. Validate worksheet names: `if (!workbook.getWorksheet("Branches")) return error`
2. Use header row to find column indices (don't assume column A = name):

```typescript
// Source: Research synthesis
const headerRow = worksheet.getRow(1);
const columnMap = new Map<string, number>();
headerRow.eachCell((cell, colNumber) => {
  const header = cell.value?.toString().trim().toLowerCase();
  if (header === "branch name") columnMap.set("name", colNumber);
  if (header === "branch code") columnMap.set("code", colNumber);
  // ...
});

if (!columnMap.has("name") || !columnMap.has("code")) {
  return { error: "Missing required columns: Branch Name, Branch Code" };
}
```

3. Add instructions worksheet in template explaining requirements.

**Warning signs:** Parser works with your test file but fails with user uploads; errors like "Cannot read property 'value' of undefined."

### Pitfall 3: Zustand State Desynchronization Between localStorage and PostgreSQL

**What goes wrong:** User saves progress on Device A, switches to Device B, sees stale data from localStorage. Or: localStorage has newer data but is expired.

**Why it happens:** localStorage is device-specific. Zustand persist middleware loads localStorage immediately, before server data fetch completes.

**How to avoid:**

1. **Load order:** Fetch server state on mount, then merge with localStorage:

```typescript
// Priority: server > localStorage (if server data exists and is newer)
useEffect(() => {
  async function hydrateFromServer() {
    const serverData = await getWizardProgress();
    if (serverData.success && serverData.data) {
      const localLastSaved = new Date(store.lastSavedAt).getTime();
      const serverLastSaved = new Date(serverData.data.updatedAt).getTime();

      if (serverLastSaved > localLastSaved) {
        // Server is newer — overwrite local
        store.setFromServer(serverData.data);
      }
    }
  }
  hydrateFromServer();
}, []);
```

2. **Explicit "Resume" action:** Show banner if server has progress: "Resume from [date]?" with Cancel/Resume buttons.

3. **Sync indicator:** Show "Saved to cloud" checkmark after successful server save.

**Warning signs:** Users report "lost progress" after switching devices; data reverts to old values; confusion between devices.

### Pitfall 4: Excel Parse Errors Crash Server Action

**What goes wrong:** Malformed Excel file (corrupted, wrong format, macros, password-protected) throws uncaught exception, crashes server action, shows generic error to user.

**Why it happens:** ExcelJS throws on parse errors. File could be genuinely corrupted or intentionally malicious.

**How to avoid:** Wrap parse in try-catch with specific error messages:

```typescript
try {
  await workbook.xlsx.load(buffer);
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("password")) {
      return { error: "Password-protected files are not supported" };
    }
    if (error.message.includes("corrupt")) {
      return {
        error: "File appears to be corrupted. Please re-save from Excel.",
      };
    }
  }
  return {
    error: "Unable to read Excel file. Ensure it is a valid .xlsx file.",
  };
}
```

**Warning signs:** Server logs show uncaught exceptions; users see generic 500 errors; works with your test files but fails with user files.

### Pitfall 5: PostgreSQL Transaction Deadlocks During Concurrent Saves

**What goes wrong:** Two server actions try to upsert OnboardingProgress simultaneously (user clicks "Save" twice quickly, or multi-tab scenario), PostgreSQL deadlock error.

**Why it happens:** `upsert` is implemented as SELECT → INSERT or UPDATE. Concurrent upserts on same `tenantId` can deadlock.

**How to avoid:**

1. **Client-side debouncing:** Already implemented in step-4-org-structure.tsx (500ms debounce).
2. **Optimistic concurrency control:** Add `version` field, increment on update:

```typescript
update: {
  stepData: newData,
  version: { increment: 1 },
}
```

3. **Retry logic:** Wrap server action in retry with exponential backoff:

```typescript
async function saveWithRetry(fn: () => Promise<any>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** i));
    }
  }
}
```

**Warning signs:** Errors mentioning "deadlock detected"; saves fail intermittently; more failures with multiple tabs open.

## Code Examples

Verified patterns from official sources and existing codebase:

### 1. ExcelJS: Read Excel from Buffer

```typescript
// Source: ExcelJS official docs + Context7
import ExcelJS from "exceljs";

export async function parseOrgStructureExcel(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Extract branches
  const branchSheet = workbook.getWorksheet("Branches");
  if (!branchSheet) {
    throw new Error("Missing 'Branches' worksheet");
  }

  const branches: BranchEntry[] = [];
  branchSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const name = row.getCell(1).value?.toString()?.trim() || "";
    const code = row.getCell(2).value?.toString()?.trim() || "";
    const city = row.getCell(3).value?.toString()?.trim() || "";
    const state = row.getCell(4).value?.toString()?.trim() || "";
    const type = row.getCell(5).value?.toString()?.trim() || "";

    // Validate required fields
    if (!name || !code || !city || !state || !type) {
      throw new Error(`Row ${rowNumber}: Missing required field(s)`);
    }

    branches.push({ name, code, city, state, type });
  });

  return { branches };
}
```

### 2. Next.js Server Action: File Upload with FormData

```typescript
// Source: Next.js docs + Vercel guides
"use server";

import { getRequiredSession } from "@/data-access/session";

export async function uploadOrgStructureAction(formData: FormData) {
  const session = await getRequiredSession();
  const tenantId = session.user.tenantId;

  const file = formData.get("excel") as File;
  if (!file) {
    return { success: false, error: "No file uploaded" };
  }

  // Validate file size (5MB limit)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return { success: false, error: "File size exceeds 5MB limit" };
  }

  // Convert to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Parse Excel
  try {
    const { branches, departments } = await parseOrgStructureExcel(buffer);

    // Save to store (let existing completion flow handle DB insert)
    return { success: true, data: { branches, departments } };
  } catch (error) {
    console.error("Excel parse error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to parse Excel file",
    };
  }
}
```

### 3. File Type Validation with Magic Bytes

```typescript
// Source: file-type npm package docs
import { fileTypeFromBuffer } from "file-type";

export async function validateExcelFile(buffer: Buffer): Promise<boolean> {
  const fileType = await fileTypeFromBuffer(buffer);

  // XLSX magic bytes: PK\x03\x04 (ZIP archive)
  // Full MIME: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  return (
    fileType?.mime ===
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
}
```

### 4. React Dropzone for File Upload UI

```typescript
// Source: react-dropzone docs + AEGIS dependencies
import { useDropzone } from "react-dropzone";
import { Upload } from "@/lib/icons";

export function ExcelUploadButton({ onUpload }: { onUpload: (file: File) => void }) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024, // 5MB
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onUpload(acceptedFiles[0]);
      }
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition",
        isDragActive ? "border-primary bg-primary/5" : "border-gray-300"
      )}
    >
      <input {...getInputProps()} />
      <Upload className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-2 text-sm text-gray-600">
        {isDragActive ? "Drop Excel file here" : "Drag & drop Excel file, or click to browse"}
      </p>
      <p className="mt-1 text-xs text-gray-500">Max file size: 5MB</p>
    </div>
  );
}
```

## State of the Art

| Old Approach              | Current Approach                | When Changed       | Impact                                                                                                                                            |
| ------------------------- | ------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| SheetJS (xlsx npm)        | ExcelJS                         | 2023-2024          | SheetJS npm registry abandoned by maintainers (last publish 2018); ExcelJS now recommended for new projects; better TypeScript, streaming support |
| MIME type validation only | Magic bytes (file-type) + MIME  | 2020+              | MIME types easily spoofed; magic bytes are binary-level validation; industry best practice                                                        |
| CSV for bulk upload       | Excel with data validation      | 2015+              | Excel provides better UX (dropdowns, validation, formatting); CSV has no standard (encoding, delimiters); Excel expected in enterprise/banking    |
| Client-only form state    | Hybrid localStorage + server DB | 2022+              | Users expect cross-device sync; localStorage alone fails across devices; hybrid approach gives instant feedback + persistence                     |
| Manual JSON serialization | Prisma JSON fields              | Prisma 2.0+ (2020) | JSON columns avoid complex schema changes for flexible wizard data; Prisma handles serialization/validation                                       |

**Deprecated/outdated:**

- **SheetJS (xlsx) on npm registry:** Last updated 2018. Use ExcelJS or install from cdn.sheetjs.com (not recommended).
- **CSV-only bulk upload:** Excel has replaced CSV for structured data import in enterprise apps.
- **File upload via API route + multer:** Next.js server actions handle FormData natively; simpler than API routes + middleware.

## Open Questions

1. **What happens if user uploads Excel with 500+ branches?**
   - What we know: ExcelJS supports streaming reader for large files; transaction size concern for bulk insert
   - What's unclear: Should we batch insert branches (e.g., 50 at a time)? Should we show progress bar?
   - Recommendation: Start with synchronous parse-and-return (fast for <100 rows). If performance issue, add streaming reader + batch processing. Banks rarely have >100 branches (Tier 3/4 UCBs typically have 5-20).

2. **Should Excel upload replace existing branches or merge?**
   - What we know: User might already have manually entered branches, then uploads Excel
   - What's unclear: UX expectation — replace all? Skip duplicates? Update existing by code?
   - Recommendation: Show confirmation dialog before upload: "Replace all existing branches with uploaded data?" Option 1: Replace (delete existing, insert new). Option 2: Merge (skip codes that exist). **Ask user during planning.**

3. **Do we need to store original uploaded Excel file?**
   - What we know: AWS S3 is configured; Evidence model already stores S3 keys
   - What's unclear: Audit trail requirement — should we keep original file for "proof of data source"?
   - Recommendation: **Not required for v1.** We parse → store data → discard file. If audit trail needed later, add optional S3 upload + link in OnboardingProgress table.

4. **Should we validate branch codes are unique across Excel file?**
   - What we know: Schema has unique constraint on `(tenantId, code)`; database will reject duplicates
   - What's unclear: Better to catch duplicates during parse (clearer error) or let DB constraint catch (transaction rollback)?
   - Recommendation: Validate during parse for better error messages: "Duplicate branch code 'BR001' found in rows 2 and 5." Prevents cryptic Prisma error.

5. **Do we need undo/rollback for Excel upload?**
   - What we know: Excel upload happens _before_ final onboarding submission (Step 4 of 6)
   - What's unclear: Can user "undo" Excel upload and return to manual entry?
   - Recommendation: Yes — store upload in Zustand state only (don't persist to DB until final submit). User can switch back to manual entry tab, clearing Excel data.

## Sources

### Primary (HIGH confidence)

- [ExcelJS GitHub Repository](https://github.com/exceljs/exceljs) - Official docs, 248 Context7 code snippets
- [Next.js Server Actions Documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions) - Official Next.js docs
- [Prisma Upsert Documentation](https://github.com/prisma/docs/blob/main/content/200-orm/200-prisma-client/100-queries/030-crud.mdx) - Official Prisma docs
- [file-type npm Package](https://www.npmjs.com/package/file-type) - Official package docs for magic byte validation
- AEGIS Codebase - Existing patterns in src/stores/onboarding-store.ts, src/actions/onboarding.ts, src/data-access/onboarding.ts

### Secondary (MEDIUM confidence)

- [ExcelJS vs SheetJS Comparison](https://npmtrends.com/exceljs-vs-sheetjs-vs-xlsx) - npm trends data, community consensus
- [Multi-Step Form State Management (2026)](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns) - Modern patterns, Zustand + React Query hybrid approach
- [File Upload Security Best Practices](https://pye.hashnode.dev/how-to-validate-javascript-file-types-with-magic-bytes-and-mime-type) - Validated with multiple sources
- [Next.js File Upload Tutorial (Strapi)](https://strapi.io/blog/epic-next-js-15-tutorial-part-5-file-upload-using-server-actions) - Verified pattern with server actions

### Tertiary (LOW confidence, flagged for validation)

- [SheetJS Security Vulnerabilities](https://npmcompare.com/compare/exceljs,node-xlsx,xlsx) - Mentioned in search results, need to verify specific CVEs if choosing SheetJS
- [Next.js bodySizeLimit Production Issues](https://github.com/vercel/next.js/discussions/77505) - GitHub discussion, unresolved, marked for testing in production

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** - All libraries already installed and in active use in codebase; ExcelJS verified via Context7 (248 snippets) + official docs
- Architecture: **HIGH** - Patterns validated against Next.js official docs + Prisma official docs + existing AEGIS patterns
- Pitfalls: **MEDIUM-HIGH** - File upload pitfalls verified via multiple sources; state sync issues are logical conclusions from architecture but not observed in production yet

**Research date:** 2026-02-10
**Valid until:** ~60 days (stable ecosystem: Next.js 16, Prisma 7, ExcelJS 4 are mature)

**Dependencies already installed (package.json verified):**

- exceljs: 4.4.0 ✅
- file-type: 21.3.0 ✅
- react-dropzone: 14.4.0 ✅
- zustand: 5.0.11 ✅
- zod: 4.3.6 ✅
- @prisma/client: 7.3.0 ✅

**Next steps for planner:**

1. Confirm UX for Excel upload merge/replace behavior (Open Question #2)
2. Decide on file size limit: 5MB (recommended) or 10MB for large banks
3. Determine if undo/rollback for Excel upload is required (Open Question #5)
