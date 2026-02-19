---
phase: gap-closure-a
plan: A2
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/(dashboard)/audit-execution/create/page.tsx
  - src/components/audit-execution/engagement-form.tsx
  - src/actions/audit-execution/create-engagement.ts
  - src/actions/audit-execution/assign-team.ts
  - src/actions/audit-execution/schemas.ts
  - src/data-access/audit-teams.ts
autonomous: true
gap_closure: true
must_haves:
  truths:
    - "Users can create new audit engagements via UI form with branch selection, audit area, dates"
    - "Engagement form includes real user selector populated from getAssignableUsers() DAL"
    - "Team members can be assigned with role (LEAD_AUDITOR or FIELD_AUDITOR) and section allocation"
    - "Section allocation dropdown shows 25 examination area codes for assignment"
    - "Created engagement wires to existing AuditTeamMember model via assignTeam() action"
  artifacts:
    - path: "src/actions/audit-execution/create-engagement.ts"
      provides: "Server action to create AuditEngagement record"
      exports: ["createEngagement"]
    - path: "src/actions/audit-execution/assign-team.ts"
      provides: "Server action to assign team members with sections"
      exports: ["assignTeamMember", "removeTeamMember"]
    - path: "src/data-access/audit-teams.ts"
      provides: "DAL to get assignable users + get team members for engagement"
      min_lines: 30
    - path: "src/components/audit-execution/engagement-form.tsx"
      provides: "Client form component with user + section selection"
      contains: "getAssignableUsers"
  key_links:
    - from: "src/components/audit-execution/engagement-form.tsx"
      to: "src/actions/audit-execution/create-engagement.ts"
      via: "Form submission calls createEngagement action"
      pattern: "createEngagement"
    - from: "src/actions/audit-execution/create-engagement.ts"
      to: "AuditEngagement model"
      via: "prisma.auditEngagement.create()"
      pattern: "auditEngagement\\.create"
    - from: "src/actions/audit-execution/assign-team.ts"
      to: "AuditTeamMember model"
      via: "prisma.auditTeamMember.create() with roleInEngagement + assignedSections"
      pattern: "auditTeamMember\\.create"
---

## Objective

Implement R10-R11, R13: Engagement management create/edit UI with real user selection for team assignment and section allocation per team member, wiring to existing AuditTeamMember model.

**Purpose:** Enable engagement creation with proper team assignment, replacing placeholder UI and enabling real audit execution workflows per SDD p.51.

**Output:**

- Create engagement form with branch, audit area, period, team selection
- Real user selector (LEAD_AUDITOR, FIELD_AUDITOR roles)
- Section allocation dropdown per team member (25 examination areas)
- Server actions to create engagement and manage team assignments
- DAL layer to fetch assignable users

## Execution Context

@/root/.openclaw/workspace/.claude/agents/gsd-planner.md
@/root/.openclaw/workspace/.claude/workflows/execute-plan.md

## Context

@AEGIS/.planning/REQUIREMENTS.md — R10, R11, R13 specifications
@AEGIS/.planning/VALIDATION-REPORT.md — R10-R13 gap descriptions
@AEGIS/prisma/schema.prisma — AuditEngagement, AuditTeamMember, ExaminationArea models
@AEGIS/.planning/codebase/CONVENTIONS.md — server action, DAL, form patterns
@AEGIS/src/data-access/users.ts — existing user DAL for reference
@AEGIS/src/components/observations/observation-form.tsx — existing form pattern for reference

## Tasks

<task type="auto">
  <name>Task 1: DAL — Audit team data access</name>
  <files>src/data-access/audit-teams.ts</files>
  <action>
  Create `src/data-access/audit-teams.ts` with functions:

**1a. `getAssignableUsers(session: Session): Promise<AssignableUser[]>`**

- Extract tenantId from session
- Use `prismaForTenant(tenantId)`
- Query users with roles containing LEAD_AUDITOR or FIELD_AUDITOR
- Use: `where: { tenantId, roles: { hasSome: ["LEAD_AUDITOR", "FIELD_AUDITOR"] }, status: "ACTIVE" }`
- Select: id, name, email, roles
- Sort by name ascending
- Return array of `{ id, name, email, roles }`

**Type:**

```typescript
export type AssignableUser = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};
```

**1b. `getTeamMembers(session: Session, engagementId: string): Promise<TeamMember[]>`**

- Extract tenantId from session
- Use `prismaForTenant(tenantId)`
- Query AuditTeamMember with:
  - `where: { engagementId, tenantId }`
  - `include: { user: { select: { id: true, name: true, email: true } } }`
- Return array of `{ id, userId, user: { name, email }, roleInEngagement, assignedSections }`

**Type:**

```typescript
export type TeamMember = {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  roleInEngagement: string;
  assignedSections: string[];
};
```

**1c. `getExaminationAreaCodes(session: Session): Promise<string[]>`**

- Extract tenantId from session
- Use `prismaForTenant(tenantId)`
- Query ExaminationArea with: `where: { tenantId, isActive: true }`
- Order by displayOrder
- Select only `code` field
- Return array of codes: ["CASH", "ATM", "CLEARING", ...]

**IMPORTANT:** Follow existing DAL patterns (session auth, prismaForTenant, error handling with logger).
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/data-access/audit-teams.ts 2>&1 | head -20
```

Must compile without errors. Must export getAssignableUsers, getTeamMembers, getExaminationAreaCodes.
</verify>
<done>

- `src/data-access/audit-teams.ts` exists with ≥30 lines
- `getAssignableUsers()` queries users with LEAD_AUDITOR or FIELD_AUDITOR roles
- `getTeamMembers()` fetches AuditTeamMember with user relation
- `getExaminationAreaCodes()` returns active examination area codes
- All functions use session auth and prismaForTenant
- TypeScript compiles successfully
  </done>
  </task>

<task type="auto">
  <name>Task 2: Server Actions — Create engagement and assign team</name>
  <files>src/actions/audit-execution/schemas.ts, src/actions/audit-execution/create-engagement.ts, src/actions/audit-execution/assign-team.ts</files>
  <action>
  **2a. Create `src/actions/audit-execution/schemas.ts`:**
  ```typescript
  import { z } from "zod";

export const CreateEngagementSchema = z.object({
auditPlanId: z.string().uuid(),
branchId: z.string().uuid(),
auditAreaId: z.string().uuid().optional(),
auditNumber: z.string().min(3).max(50),
auditType: z.string().default("RBIA"),
visitNumber: z.number().int().positive().default(1),
periodFrom: z.string().datetime(),
periodTo: z.string().datetime(),
scheduledStartDate: z.string().datetime().optional(),
});

export type CreateEngagementInput = z.infer<typeof CreateEngagementSchema>;

export const AssignTeamMemberSchema = z.object({
engagementId: z.string().uuid(),
userId: z.string().uuid(),
roleInEngagement: z.enum(["LEAD_AUDITOR", "FIELD_AUDITOR"]),
assignedSections: z.array(z.string()).default([]), // Array of examination area codes
});

export type AssignTeamMemberInput = z.infer<typeof AssignTeamMemberSchema>;

export const RemoveTeamMemberSchema = z.object({
teamMemberId: z.string().uuid(),
});

export type RemoveTeamMemberInput = z.infer<typeof RemoveTeamMemberSchema>;

````

**2b. Create `src/actions/audit-execution/create-engagement.ts`:**

Follow standard server action boilerplate:
1. "use server" directive
2. Imports: getRequiredSession, prismaForTenant, setAuditContext, hasPermission, logger
3. Check permission: `hasPermission(userRoles, "audit_execution:create")`
4. Validate input with CreateEngagementSchema
5. Transaction:
   - Set audit context: `actionType: "audit_engagement.created"`
   - Create AuditEngagement: `tx.auditEngagement.create({ data: { tenantId, ...validated, status: "PLANNED" } })`
   - Return engagement.id
6. revalidatePath("/audit-execution")
7. Return `{ success: true, data: { id } }`

**2c. Create `src/actions/audit-execution/assign-team.ts`:**

Two server actions in this file:

**assignTeamMember():**
1. "use server" directive
2. Check permission: `hasPermission(userRoles, "audit_execution:manage_team")`
3. Validate input with AssignTeamMemberSchema
4. Transaction:
   - Set audit context: `actionType: "audit_team.assigned"`
   - Check if user already assigned: `tx.auditTeamMember.findUnique({ where: { engagementId_userId } })`
   - If exists, throw error: "User already assigned to this engagement"
   - Create AuditTeamMember: `tx.auditTeamMember.create({ data: { tenantId, ...validated } })`
5. revalidatePath("/audit-execution/[id]")
6. Return `{ success: true, data: { id } }`

**removeTeamMember():**
1. Check permission: `hasPermission(userRoles, "audit_execution:manage_team")`
2. Validate input with RemoveTeamMemberSchema
3. Transaction:
   - Set audit context: `actionType: "audit_team.removed"`
   - Delete: `tx.auditTeamMember.delete({ where: { id: validated.teamMemberId, tenantId } })`
4. revalidatePath("/audit-execution/[id]")
5. Return `{ success: true }`

**IMPORTANT:** Both actions must follow exact boilerplate from CONVENTIONS.md.
</action>
<verify>
```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/actions/audit-execution/*.ts 2>&1 | head -30
````

Must compile without errors. Check exports with:

```bash
grep -E "export.*function.*(createEngagement|assignTeamMember|removeTeamMember)" src/actions/audit-execution/*.ts
```

  </verify>
  <done>
  - schemas.ts defines CreateEngagementSchema, AssignTeamMemberSchema, RemoveTeamMemberSchema
  - create-engagement.ts implements createEngagement() with full boilerplate
  - assign-team.ts implements assignTeamMember() and removeTeamMember() with full boilerplate
  - All actions check permissions and use transactions
  - All actions set audit context with appropriate actionType
  - TypeScript compiles successfully
  </done>
</task>

<task type="auto">
  <name>Task 3: UI — Engagement create form with team assignment</name>
  <files>src/app/(dashboard)/audit-execution/create/page.tsx, src/components/audit-execution/engagement-form.tsx, src/components/audit-execution/team-assignment-panel.tsx</files>
  <action>
  **3a. Create `src/components/audit-execution/engagement-form.tsx` (client component):**
  - "use client" directive
  - Use react-hook-form with zodResolver(CreateEngagementSchema)
  - Fetch branches, audit areas, audit plans on mount (pass as props from server component)
  - Form fields:
    - Audit Plan selector (dropdown)
    - Branch selector (dropdown)
    - Audit Area selector (optional dropdown)
    - Audit Number (text input)
    - Audit Type (dropdown: RBIA, CONCURRENT, IS_EDP, STATUTORY)
    - Visit Number (number input, default 1)
    - Period From (date picker)
    - Period To (date picker)
    - Scheduled Start Date (date picker, optional)
  - On submit: call createEngagement() action
  - On success: redirect to `/audit-execution/${engagementId}` and show success toast
  - On error: show error toast

**3b. Create `src/components/audit-execution/team-assignment-panel.tsx` (client component):**

- "use client" directive
- Props: `{ engagementId: string, users: AssignableUser[], examinationAreas: string[], teamMembers: TeamMember[] }`
- Display current team members in a table: Name, Email, Role, Assigned Sections, Remove button
- "Add Team Member" form:
  - User selector (dropdown from users prop)
  - Role selector (LEAD_AUDITOR or FIELD_AUDITOR)
  - Section selector (multi-select from examinationAreas prop)
  - Submit button → calls assignTeamMember() action
- Remove button per row → calls removeTeamMember() action
- Toast notifications on success/error

**3c. Create `src/app/(dashboard)/audit-execution/create/page.tsx` (server component):**

- Fetch required data:
  - branches (via DAL)
  - auditAreas (via DAL)
  - auditPlans (via DAL)
- Render EngagementForm with data passed as props
- Use Card layout from shadcn/ui

**UI Structure:**

```tsx
<div className="mx-auto max-w-4xl">
  <Card>
    <CardHeader>
      <CardTitle>Create Audit Engagement</CardTitle>
      <CardDescription>
        Set up a new audit engagement with team assignment
      </CardDescription>
    </CardHeader>
    <CardContent>
      <EngagementForm
        branches={branches}
        auditAreas={auditAreas}
        auditPlans={auditPlans}
      />
    </CardContent>
  </Card>
</div>
```

**IMPORTANT:** Follow form patterns from CONVENTIONS.md. Use shadcn/ui components (Card, Form, Select, Input, Button, Calendar). Use sonner for toasts.
</action>
<verify>

```bash
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit src/app/(dashboard)/audit-execution/create/page.tsx src/components/audit-execution/*.tsx 2>&1 | head -30
```

Must compile without errors. Check for "use client" directives:

```bash
grep -l '"use client"' src/components/audit-execution/engagement-form.tsx src/components/audit-execution/team-assignment-panel.tsx
```

  </verify>
  <done>
  - engagement-form.tsx exists as client component with "use client" directive
  - Form uses react-hook-form with zodResolver(CreateEngagementSchema)
  - Form has all required fields per R11 (auditNumber, auditType, visitNumber, periodFrom/To, dates)
  - team-assignment-panel.tsx exists as client component
  - Panel displays current team members table with Remove buttons
  - Panel has "Add Team Member" form with user selector, role selector, multi-select sections
  - create/page.tsx server component fetches and passes required data as props
  - TypeScript compiles successfully
  - All components use shadcn/ui and sonner
  </done>
</task>

## Verification

```bash
# 1. TypeScript compilation
cd /root/.openclaw/workspace/AEGIS && pnpm exec tsc --noEmit

# 2. Check DAL exports
grep -E "export.*(getAssignableUsers|getTeamMembers|getExaminationAreaCodes)" src/data-access/audit-teams.ts && echo "PASS: DAL exports" || echo "FAIL: Missing DAL exports"

# 3. Check action exports
grep -E "export.*function.*(createEngagement|assignTeamMember|removeTeamMember)" src/actions/audit-execution/*.ts && echo "PASS: Actions exported" || echo "FAIL: Missing actions"

# 4. Check form component exists
ls src/components/audit-execution/engagement-form.tsx && echo "PASS: Form component exists" || echo "FAIL: Form missing"

# 5. Check team panel exists
ls src/components/audit-execution/team-assignment-panel.tsx && echo "PASS: Team panel exists" || echo "FAIL: Team panel missing"
```

## Success Criteria

1. **R10-R11, R13 gaps closed:** Engagement management UI with team assignment implemented
2. **DAL layer:** getAssignableUsers() fetches users with LEAD_AUDITOR/FIELD_AUDITOR roles
3. **Server actions:**
   - createEngagement() creates AuditEngagement record
   - assignTeamMember() creates AuditTeamMember with roleInEngagement + assignedSections
   - removeTeamMember() deletes team member
4. **UI:**
   - Create engagement form with all R11 fields (auditNumber, auditType, visitNumber, periods)
   - Real user selector populated from DAL
   - Section allocation via multi-select of 25 examination area codes
   - Team assignment panel with add/remove functionality
5. **Model wiring:** Actions wire to existing AuditTeamMember model
6. **TypeScript:** All files compile successfully
7. **Conventions:** Follows server action boilerplate, DAL patterns, form patterns from CONVENTIONS.md

## Output

After completion, create `.planning/gap-closure-a/A2-SUMMARY.md` documenting:

- How engagement creation works
- How team assignment wires to AuditTeamMember model
- How section allocation is stored (assignedSections array)
- Any validation decisions (e.g., preventing duplicate user assignment)
