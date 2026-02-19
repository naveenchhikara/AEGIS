# Wave 3E Validation (GPT-5.2) — R51, R57, R60, R61, R82, R85

Project: `/root/.openclaw/workspace/AEGIS`

Validator note: Verified by reading the referenced source files. No source changes made.

---

## R51 — KRI edit path uses safe WHERE pattern

✅ **VERIFIED** — `manageKRI` uses `findFirst({ where: { id, tenantId } })` ownership check, then `update({ where: { id } })`.

**File:** `src/actions/risk-management/manage-risk.ts`

**Evidence (key lines):**

```ts
const existing = await tx.keyRiskIndicator.findFirst({
  where: { id: parsed.data.id, tenantId },
});
...
return tx.keyRiskIndicator.update({
  where: { id: parsed.data.id },
  data: { /* ... */ },
});
```

---

## R57 — Work program generator uses findFirst

✅ **VERIFIED** — `generateWorkProgram` uses `findFirst` (not `findUnique`) for engagement lookup with `{ id, tenantId }`.

**File:** `src/actions/work-program/generate-program.ts`

**Evidence (key lines):**

```ts
const engagement = await tx.auditEngagement.findFirst({
  where: { id: parsed.data.engagementId, tenantId },
  include: {
    teamMembers: { select: { userId: true, roleInEngagement: true } },
  },
});
```

---

## R60 — Issue update path uses safe WHERE pattern

✅ **VERIFIED** — Both `manageIssue` (update branch) and `closeIssue` use `findFirst` for tenant ownership check, then `update({ where: { id } })`.

**File:** `src/actions/issues/manage-issue.ts`

**Evidence (manageIssue update branch):**

```ts
const existing = await tx.issue.findFirst({
  where: { id: parsed.data.id, tenantId },
});
...
return tx.issue.update({
  where: { id: parsed.data.id },
  data: { /* ... */ },
});
```

**Evidence (closeIssue):**

```ts
const existing = await tx.issue.findFirst({
  where: { id: issueId, tenantId },
});
...
return tx.issue.update({
  where: { id: issueId },
  data: { status: "CLOSED", closedAt: new Date() },
});
```

---

## R61 — Action plan operations use safe WHERE pattern

✅ **VERIFIED** — All required functions use `findFirst({ where: { id, tenantId } })` then `update({ where: { id } })`. No `findUnique({ where: { id, tenantId } })` and no `update({ where: { id, tenantId } })` found.

**File:** `src/actions/issues/manage-action-plan.ts`

**Evidence (manageActionPlan update path):**

```ts
const existing = await tx.actionPlan.findFirst({
  where: { id: parsed.data.id, tenantId },
});
...
return tx.actionPlan.update({
  where: { id: parsed.data.id },
  data: { /* ... */ },
});
```

**Evidence (completeActionPlan):**

```ts
const existing = await tx.actionPlan.findFirst({
  where: { id: actionPlanId, tenantId },
});
...
return tx.actionPlan.update({
  where: { id: actionPlanId },
  data: { status: "COMPLETED", completionPct: 100, /* ... */ },
});
```

**Evidence (updateActionPlanProgress):**

```ts
const existing = await tx.actionPlan.findFirst({
  where: { id: actionPlanId, tenantId },
});
...
return tx.actionPlan.update({
  where: { id: actionPlanId },
  data: { completionPct, /* ... */ },
});
```

**Evidence (addActionPlanEvidence):**

```ts
const current = await tx.actionPlan.findFirst({
  where: { id: actionPlanId, tenantId },
  select: { evidence: true },
});
...
return tx.actionPlan.update({
  where: { id: actionPlanId },
  data: { evidence: updatedEvidence },
});
```

---

## R82 — ACB Agenda Builder rendered in governance page

✅ **VERIFIED** — `AcbAgendaBuilder` is rendered in the Governance page under the `agenda` tab, and the component implementation is non-stub (interactive UI + server action call).

**File:** `src/app/(dashboard)/governance/page.tsx`

**Evidence (rendered):**

```tsx
import { AcbAgendaBuilder } from "@/components/governance/acb-agenda-builder";
...
<TabsContent value="agenda" className="space-y-4">
  <AcbAgendaBuilder />
</TabsContent>
```

**File:** `src/components/governance/acb-agenda-builder.tsx`

**Evidence (real component behavior):**

```ts
import { buildAcbAgenda } from "@/actions/governance/build-acb-agenda";
...
const result = await buildAcbAgenda({ year: selectedYear, quarter: selectedQuarter as any });
...
return (
  <div className="space-y-6">
    ...
    <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
      ...
      Generate Quarterly Pack
    </Button>
    {generatedMeeting && ( ... )}
  </div>
);
```

---

## R85 — Committee panel has member management + minutes UI

✅ **VERIFIED** — Committee panel includes interactive member add/remove UI wired to actions, plus minutes reference input + save workflow.

**File:** `src/components/governance/committee-panel.tsx`

**Evidence (member management):**

- Add member action call:

```ts
const result = await manageCommitteeMember({
  committeeId: selectedCommitteeId,
  userId: values.userId,
  role: values.role,
});
```

- "Add Member" button (interactive):

```tsx
<Button
  size="sm"
  variant="outline"
  onClick={() => openMemberDialog(committee.id)}
>
  <Plus className="mr-1 h-3 w-3" />
  Add Member
</Button>
```

- Remove member action call + button:

```ts
const result = await removeCommitteeMember(memberId);
```

```tsx
<Button size="sm" variant="ghost" onClick={() => handleRemoveMember(member.id)}>
  <X className="h-3 w-3" />
</Button>
```

**Evidence (minutes UI):**

- Minutes reference input + save (calls `manageCommitteeMeeting` with `minutesRef`):

```tsx
<Input
  type="text"
  placeholder="Minutes URL or reference"
  defaultValue={meeting.minutesRef || ""}
  onChange={(e) => {
    setEditingMinutes((prev) => ({ ...prev, [meeting.id]: e.target.value }));
  }}
/>
<Button
  size="sm"
  variant="ghost"
  onClick={() => handleSaveMinutes(meeting, editingMinutes[meeting.id] || meeting.minutesRef || "")}
>
  <Save className="h-3 w-3" />
</Button>
```

---

## Summary

All six items (R51, R57, R60, R61, R82, R85) are ✅ VERIFIED in the current source.
