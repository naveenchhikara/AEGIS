# API Reference

> **Generated file — do not edit by hand.**
> Produced by `scripts/generate-reference-docs.mjs` from `prisma/schema.prisma`
> and the `src/` tree. Regenerate with `pnpm docs:reference`.
>
> Source commit: `13d9827` (hardening/integrity-and-operations-f07-f15)

AEGIS has two callable surfaces.

**HTTP endpoints** (11) are conventional routes under `/api`, used
for file downloads, streamed exports and health checks.

**Server actions** (151 exported
functions across 86 modules) are the primary surface. They are
invoked directly from React components rather than over HTTP, so they have no
URL — the function signature is the contract. Every one runs on the server and
derives the caller's tenant from the session.

The *Audited* column marks modules routing writes through
`withAuditedMutation`, which opens the transaction and sets the session context
the database audit trigger reads.

## HTTP endpoints

### `— /api/auth/[...all]`

Better Auth API route handler

- Source: `src/app/api/auth/[...all]/route.ts`
- Rendering: `default`

### `GET /api/dashboard`

- Source: `src/app/api/dashboard/route.ts`
- Rendering: `force-dynamic`

### `GET /api/download`

Generate a presigned S3 download URL and redirect to it.

- Source: `src/app/api/download/route.ts`
- Rendering: `force-dynamic`

### `GET /api/exports/audit-plans`

- Source: `src/app/api/exports/audit-plans/route.ts`
- Rendering: `force-dynamic`

### `GET /api/exports/compliance`

- Source: `src/app/api/exports/compliance/route.ts`
- Rendering: `force-dynamic`

### `GET /api/exports/findings`

- Source: `src/app/api/exports/findings/route.ts`
- Rendering: `force-dynamic`

### `GET /api/health`

- Source: `src/app/api/health/route.ts`
- Rendering: `force-dynamic`

### `GET /api/is-audit/checklist`

Returns the most recent IS audit checklist for the given category and engagement.

- Source: `src/app/api/is-audit/checklist/route.ts`
- Rendering: `default`

### `GET /api/loan-portfolio/template`

Returns a downloadable Excel template for the specified loan module.

- Source: `src/app/api/loan-portfolio/template/route.ts`
- Rendering: `force-dynamic`

### `POST / GET /api/reports/board-report`

Generate a PDF board report, store in S3, create audit trail record.

- Source: `src/app/api/reports/board-report/route.ts`
- Rendering: `force-dynamic`

### `GET /api/reports/gap-analysis`

Generate XLSX gap analysis report from IS audit checklists (R104).

- Source: `src/app/api/reports/gap-analysis/route.ts`
- Rendering: `force-dynamic`

## Server actions

### (root)

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `auditee.ts` | — | `submitAuditeeResponse`, `requestEvidenceUpload`, `confirmEvidenceUpload`, `getEvidenceDownloadUrl` | AuditeeResponse, Evidence, Observation, ObservationTimeline |
| `compliance-management.ts` | — | `addCustomRequirement`, `markAsNotApplicable`, `revertNotApplicable`, `fetchMasterDirections`, `fetchMasterDirectionItems`, `searchCirculars`, `fetchCustomRequirements` | — |
| `notification-preferences.ts` | — | `updatePreferences` | — |
| `onboarding-excel-upload.ts` | — | `downloadOrgStructureTemplate`, `uploadOrgStructureExcel` | — |
| `onboarding.ts` | — | `saveWizardStep`, `getWizardProgress`, `completeOnboarding` | — |
| `settings.ts` | — | `updateTenantSettings` | Tenant |
| `user-invitations.ts` | yes | `sendUserInvitations`, `acceptInvitation`, `resendInvitation`, `revokeInvitation` | Account, AuditLog, Branch, User, UserBranchAssignment |
| `users.ts` | — | `updateUserRoles` | — |

### account-examination

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `account-examination/save-response.ts` | — | `saveAccountExamResponse` | AccountExamResponse, AuditEngagement, LoanAccount |

### admin

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `admin/manage-branch.ts` | yes | `updateBranchProfile` | Branch |
| `admin/manage-calendar.ts` | — | `createCalendarEvent`, `updateCalendarEvent`, `deleteCalendarEvent` | AuditCalendar |
| `admin/manage-templates.ts` | — | `createReportTemplate`, `deactivateTemplate` | ReportTemplate |
| `admin/manage-zone.ts` | — | `manageZone`, `deleteZone` | Zone |

### audit-execution

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `audit-execution/assign-team.ts` | — | `assignTeamMember`, `removeTeamMember` | AuditTeamMember |
| `audit-execution/bh-certificate.ts` | — | `signBhCertificate`, `countersignBhCertificate`, `getBhCertificateStatus` | AuditEngagement |
| `audit-execution/cash-verification.ts` | — | `saveCashVerification`, `getCashVerificationAction` | AuditEngagement, CashCheck |
| `audit-execution/create-engagement.ts` | — | `createEngagement` | AuditEngagement |
| `audit-execution/import-loan-csv.ts` | — | `importLoanReviewCsv` | AuditEngagement, LoanReview |
| `audit-execution/initialize-sections.ts` | — | `initializeSections` | AuditEngagement, AuditSectionInstance, ExaminationArea |
| `audit-execution/loan-review.ts` | — | `createLoanReview`, `updateLoanReview`, `deleteLoanReview` | AuditEngagement, LoanReview |
| `audit-execution/sma-npa.ts` | — | `saveSmaNpaEntries` | AuditEngagement, SmaNpaEntry |
| `audit-execution/submit-examination-response.ts` | — | `submitExaminationResponse` | AuditEngagement, AuditExaminationResponse, ExaminationItem, Observation, ObservationTimeline |
| `audit-execution/transition-engagement-status.ts` | — | `transitionEngagementStatus` | AuditEngagement |
| `audit-execution/update-engagement-status.ts` | — | `updateEngagementStatus` | AuditEngagement |
| `audit-execution/upload-examination-evidence.ts` | — | `requestExaminationEvidenceUpload`, `confirmExaminationEvidenceUpload`, `getExaminationEvidenceDownloadUrl` | AuditEngagement, AuditExaminationResponse, Evidence |

### audit-plans

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `audit-plans/generate-annual-plan.ts` | — | `generateAnnualPlan` | AuditEngagement, AuditPlan |
| `audit-plans/schedule-surprise-audit.ts` | — | `scheduleSurpriseAudit` | AuditEngagement, AuditPlan, Branch |
| `audit-plans/simulate-plan.ts` | — | `simulatePlan` | Branch |

### compliance

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `compliance/acb-reporting.ts` | — | `generateAcbReport` | BoardReport, ComplianceItem |
| `compliance/ace-processing.ts` | — | `processAceQuarterly`, `reviewAceItem` | ComplianceItem |
| `compliance/run-escalation-job.ts` | yes | `runEscalationJob`, `runEscalationJobInternal` | ComplianceItem, NotificationQueue, User |
| `compliance/submit-branch-response.ts` | — | `submitBranchResponse` | ComplianceItem |
| `compliance/zac-review.ts` | — | `zacReviewCompliance` | ComplianceItem |

### concurrent-audit

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `concurrent-audit/escalate-irregularity.ts` | — | `escalateIrregularity` | NotificationQueue, Observation, ObservationTimeline, User |
| `concurrent-audit/link-to-rbia.ts` | — | `linkConcurrentToRbia`, `markFindingUnique` | Observation |
| `concurrent-audit/manage-template.ts` | — | `manageTemplate`, `deleteTemplate` | ConcurrentAuditTemplate |
| `concurrent-audit/rapid-entry.ts` | — | `rapidEntryObservations` | Observation |

### control-library

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `control-library/manage-control.ts` | — | `manageControl`, `manageTestProcedure` | ControlLibrary, TestProcedure |
| `control-library/update-control.ts` | — | `updateControl` | ControlLibrary |

### examination-questions

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `examination-questions/manage-questions.ts` | — | `addQuestion`, `updateQuestion`, `deactivateQuestion`, `reactivateQuestion` | ExaminationQuestion |

### governance

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `governance/build-acb-agenda.ts` | — | `buildAcbAgenda` | AuditEngagement, Committee, CommitteeMeeting, ComplianceItem, HousekeepingMetric, Observation |
| `governance/generate-inspection-pack.ts` | — | `generateInspectionPack`, `generateInspectionPackXlsx` | AuditEngagement, Branch, ComplianceItem, IsAuditChecklist, KeyRiskIndicator, Observation, PolicyDocument, RamAssessment, RegulatoryObservation, RiskRegister |
| `governance/manage-committee.ts` | — | `manageCommittee`, `manageCommitteeMember`, `removeCommitteeMember`, `manageCommitteeMeeting` | Committee, CommitteeMeeting, CommitteeMember, User |
| `governance/manage-policy.ts` | — | `managePolicy`, `deletePolicy` | PolicyDocument |
| `governance/upload-minutes.ts` | — | `requestMinutesUpload`, `confirmMinutesUpload` | CommitteeMeeting |

### housekeeping

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `housekeeping/manage-metric.ts` | — | `manageHousekeepingMetric` | HousekeepingMetric |

### investment

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `investment/manage-is-audit.ts` | — | `manageIsAuditChecklist`, `manageApplicationInventory`, `manageVendorRiskAssessment` | ApplicationInventory, IsAuditChecklist, VendorRiskAssessment |
| `investment/manage-records.ts` | — | `manageInvestmentRecord`, `markReconciled` | InvestmentRecord |
| `investment/quarterly-certification.ts` | — | `submitQuarterlyCertification`, `getInvestmentCertifications` | IsAuditChecklist, User |
| `investment/save-classification-checklist.ts` | — | `saveClassificationChecklist` | IsAuditChecklist |
| `investment/upload-is-audit-evidence.ts` | — | `requestIsAuditEvidenceUpload`, `confirmIsAuditEvidenceUpload` | IsAuditChecklist |

### issues

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `issues/accept-risk.ts` | — | `acceptRisk`, `reopenAcceptedRisk` | Issue |
| `issues/manage-action-plan.ts` | — | `manageActionPlan`, `completeActionPlan`, `updateActionPlanProgress`, `addActionPlanEvidence` | ActionPlan |
| `issues/manage-issue.ts` | — | `manageIssue`, `closeIssue` | ActionPlan, Issue |
| `issues/verify-evidence.ts` | — | `verifyEvidence` | ActionPlan |

### loan-portfolio

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `loan-portfolio/get-portfolio-summary.ts` | — | `getPortfolioSummary` | — |
| `loan-portfolio/import-loan-portfolio.ts` | — | `importLoanPortfolio` | AuditEngagement, LoanAccount |
| `loan-portfolio/parse-excel-file.ts` | — | `parseExcelFile` | — |

### observations

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `observations/create.ts` | — | `createObservation` | Observation, ObservationTimeline |
| `observations/resolve-fieldwork.ts` | — | `resolveFieldwork` | Observation, ObservationTimeline |
| `observations/transition.ts` | — | `transitionObservation` | ComplianceItem, Observation, ObservationTimeline |

### qa-assessment

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `qa-assessment/gap-to-issue.ts` | — | `convertGapToIssue`, `bulkConvertGapsToIssues` | Issue, QaSelfAssessment |
| `qa-assessment/manage-assessment.ts` | — | `manageQaAssessment`, `createQaAssessmentsFromTemplate` | QaSelfAssessment |

### ram

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `ram/approve-assessment.ts` | — | `approveRamAssessment` | RamAssessment |
| `ram/compute-assessment.ts` | — | `computeRamAssessment` | Branch, RamAssessment |
| `ram/create-assessment.ts` | — | `createRamAssessment` | Branch, RamAssessment |
| `ram/save-scores.ts` | — | `saveRamScores` | RamAssessment, RamAssessmentScore |

### rbia

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `rbia/bm-evidence.ts` | — | `requestBmEvidenceUpload`, `confirmBmEvidenceUpload` | ActionPoint, Evidence |
| `rbia/examination.ts` | — | `saveExaminationResponse`, `autoSelectModulesAction`, `addModuleSelectionAction`, `removeModuleSelectionAction` | ActionPoint, AuditEngagement, EngagementModuleSelection, ExaminationNode, ExaminationResponse |
| `rbia/findings.ts` | — | `createActionPoint`, `updateActionPoint`, `deleteActionPoint`, `promoteToObservation`, `submitBmResponse` | ActionPoint, AuditEngagement, BmResponseBatch, Observation |
| `rbia/freeze.ts` | — | `freezeRbiaScore` | ActionPoint, AuditEngagement, BmResponseBatch, BranchRbiaScore, EngagementModuleSelection, ExaminationNode, ExaminationResponse |
| `rbia/meetings.ts` | — | `recordMeeting`, `signOffMeeting` | AuditEngagement, EngagementMeeting |

### regulatory

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `regulatory/manage-observation.ts` | — | `manageRegulatoryObservation` | RegulatoryObservation |
| `regulatory/submit-atr.ts` | — | `submitAtr` | RegulatoryObservation |

### repeat-findings

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `repeat-findings/confirm.ts` | yes | `confirmRepeatFinding`, `dismissRepeatFinding` | Observation, ObservationTimeline |
| `repeat-findings/detect.ts` | — | `detectRepeatFindings` | — |

### reports

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `reports/generate-pdf.ts` | yes | `generatePdfReport` | BoardReport, ReportTemplate |
| `reports/generate-xlsx.ts` | yes | `generateXlsxReport` | BoardReport, ReportTemplate |
| `reports/transition-report.ts` | — | `transitionReportStatus` | AuditEngagement |

### risk-management

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `risk-management/manage-linkage.ts` | — | `manageRiskAuditLinkage` | RiskAuditLinkage |
| `risk-management/manage-risk.ts` | — | `manageRisk`, `manageKRI` | KeyRiskIndicator, RiskRegister |

### sampling

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `sampling/generate-sample.ts` | — | `generateSampleAction` | LoanAccount, SamplingConfig |
| `sampling/save-criteria.ts` | — | `saveSamplingCriteria` | SamplingConfig |

### work-program

| Module | Audited | Exported functions | Tables touched |
|---|---|---|---|
| `work-program/create-item.ts` | — | `createWorkProgramItem` | AuditEngagement, ControlLibrary, TestProcedure, WorkProgramItem |
| `work-program/execute-item.ts` | — | `executeWorkProgramItem`, `assignWorkProgramItem` | ControlLibrary, WorkProgramItem |
| `work-program/generate-program.ts` | — | `generateWorkProgram` | AuditEngagement, TestProcedure, WorkProgramItem |

