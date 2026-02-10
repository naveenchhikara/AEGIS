/**
 * AEGIS Database Seed Script
 *
 * Seeds the database with demo data for 2 tenants:
 *   1. Apex Sahakari Bank (primary demo tenant with full data)
 *   2. Test Bank B (minimal tenant for isolation testing)
 *
 * Run: pnpm prisma db seed
 */

import {
  PrismaClient,
  Role,
  Severity,
  ObservationStatus,
  ComplianceStatus,
  UcbTier,
  PcaStatus,
  Quarter,
  AuditPlanStatus,
  EngagementStatus,
  UserStatus,
} from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Severity / status mappers ───────────────────────────────────────────────

function mapSeverity(s: string): Severity {
  const map: Record<string, Severity> = {
    critical: "CRITICAL",
    high: "HIGH",
    medium: "MEDIUM",
    low: "LOW",
  };
  return map[s.toLowerCase()] ?? "MEDIUM";
}

function mapObservationStatus(s: string): ObservationStatus {
  const map: Record<string, ObservationStatus> = {
    draft: "DRAFT",
    submitted: "SUBMITTED",
    reviewed: "REVIEWED",
    issued: "ISSUED",
    responded: "RESPONSE",
    closed: "CLOSED",
  };
  return map[s.toLowerCase()] ?? "DRAFT";
}

function mapComplianceStatus(s: string): ComplianceStatus {
  const map: Record<string, ComplianceStatus> = {
    compliant: "COMPLIANT",
    partial: "PARTIAL",
    "non-compliant": "NON_COMPLIANT",
    pending: "PENDING",
  };
  return map[s.toLowerCase()] ?? "PENDING";
}

function mapAuditStatus(s: string): AuditPlanStatus {
  const map: Record<string, AuditPlanStatus> = {
    completed: "COMPLETED",
    "in-progress": "IN_PROGRESS",
    planned: "PLANNED",
    "on-hold": "ON_HOLD",
    cancelled: "CANCELLED",
  };
  return map[s.toLowerCase()] ?? "PLANNED";
}

// Map audit type to an Indian fiscal quarter based on date
function dateToQuarter(dateStr: string): Quarter {
  const month = new Date(dateStr).getMonth() + 1; // 1-12
  if (month >= 4 && month <= 6) return "Q1_APR_JUN";
  if (month >= 7 && month <= 9) return "Q2_JUL_SEP";
  if (month >= 10 && month <= 12) return "Q3_OCT_DEC";
  return "Q4_JAN_MAR"; // Jan-Mar
}

function fiscalYear(dateStr: string): number {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1;
  const year = d.getFullYear();
  // Indian fiscal year: Apr 2025 - Mar 2026 → FY 2025
  return month >= 4 ? year : year - 1;
}

async function main() {
  console.log("🌱 Seeding AEGIS database...\n");

  // ─── 1. Clean existing data ──────────────────────────────────────────

  console.log("  Cleaning existing data...");
  // Delete in dependency order (children before parents)
  await prisma.failedLoginAttempt.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.emailLog.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
  await prisma.onboardingProgress.deleteMany();
  await prisma.notificationQueue.deleteMany();
  await prisma.notificationPreference.deleteMany();
  await prisma.boardReport.deleteMany();
  await prisma.observationTimeline.deleteMany();
  await prisma.observationRbiCircular.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.auditeeResponse.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.complianceRequirement.deleteMany();
  await prisma.userBranchAssignment.deleteMany();
  await prisma.auditEngagement.deleteMany();
  await prisma.auditPlan.deleteMany();
  await prisma.auditArea.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.rbiCircular.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // ─── 2. Create Tenants ───────────────────────────────────────────────

  console.log("  Creating tenants...");

  const tenantA = await prisma.tenant.create({
    data: {
      name: "Apex Sahakari Bank Ltd",
      shortName: "Apex Bank",
      rbiLicenseNo: "UCB-MAH-1985-1234",
      tier: UcbTier.TIER_2,
      state: "Maharashtra",
      city: "Pune",
      scheduledBankStatus: true,
      nabardRegistrationNo: null,
      multiStateLicense: false,
      // DAKSH/PCA fields — nullable for demo (D21)
      dakshScore: null,
      dakshScoreDate: null,
      pcaStatus: PcaStatus.NONE,
      pcaEffectiveDate: null,
      lastRbiInspectionDate: null,
      rbiRiskRating: null,
      settings: {
        defaultLanguage: "en",
        fiscalYearStart: "April",
        timezone: "Asia/Kolkata",
      },
    },
  });

  const tenantB = await prisma.tenant.create({
    data: {
      name: "Test Nagari Sahakari Bank Ltd",
      shortName: "Test Bank B",
      rbiLicenseNo: "UCB-KAR-2000-5678",
      tier: UcbTier.TIER_3,
      state: "Karnataka",
      city: "Bengaluru",
      scheduledBankStatus: false,
      pcaStatus: PcaStatus.NONE,
      settings: {
        defaultLanguage: "en",
        fiscalYearStart: "April",
        timezone: "Asia/Kolkata",
      },
    },
  });

  console.log(`    ✓ Tenant A: ${tenantA.name} (${tenantA.id})`);
  console.log(`    ✓ Tenant B: ${tenantB.name} (${tenantB.id})`);

  // ─── 3. Create Users with role ARRAYS (D13) ─────────────────────────

  console.log("  Creating users...");

  const userCEO = await prisma.user.create({
    data: {
      email: "rajesh.deshmukh@apexbank.example",
      name: "Rajesh Deshmukh",
      roles: [Role.CEO],
      tenantId: tenantA.id,
      status: UserStatus.ACTIVE,
    },
  });

  // Multi-role user: CAE + AUDIT_MANAGER (D13 — small bank dual-hatting)
  const userCAE = await prisma.user.create({
    data: {
      email: "priya.sharma@apexbank.example",
      name: "Priya Sharma",
      roles: [Role.CAE, Role.AUDIT_MANAGER],
      tenantId: tenantA.id,
      status: UserStatus.ACTIVE,
    },
  });

  const userCCO = await prisma.user.create({
    data: {
      email: "amit.joshi@apexbank.example",
      name: "Amit Joshi",
      roles: [Role.CCO],
      tenantId: tenantA.id,
      status: UserStatus.ACTIVE,
    },
  });

  const userAuditor = await prisma.user.create({
    data: {
      email: "suresh.patil@apexbank.example",
      name: "Suresh Patil",
      roles: [Role.AUDITOR],
      tenantId: tenantA.id,
      status: UserStatus.ACTIVE,
    },
  });

  // Multi-role: AUDITEE + AUDITOR (branch manager who also participates in audits)
  const userAuditee = await prisma.user.create({
    data: {
      email: "vikram.kulkarni@apexbank.example",
      name: "Vikram Kulkarni",
      roles: [Role.AUDITEE, Role.AUDITOR],
      tenantId: tenantA.id,
      status: UserStatus.ACTIVE,
    },
  });

  // Test Bank B user
  const userBankB = await prisma.user.create({
    data: {
      email: "admin@testbank.example",
      name: "Test Bank Admin",
      roles: [Role.CEO, Role.CAE],
      tenantId: tenantB.id,
      status: UserStatus.ACTIVE,
    },
  });

  const allUsersA = [userCEO, userCAE, userCCO, userAuditor, userAuditee];
  console.log(`    ✓ Created ${allUsersA.length} users for Tenant A`);
  console.log(`    ✓ Created 1 user for Tenant B`);
  console.log(
    `    ✓ Multi-role users: ${userCAE.name} (CAE+AUDIT_MANAGER), ${userAuditee.name} (AUDITEE+AUDITOR), ${userBankB.name} (CEO+CAE)`,
  );

  // ─── 3b. Create Better Auth Accounts (passwords for login) ─────────

  console.log("  Creating auth accounts...");
  const TEST_PASSWORD = "TestPassword123!";
  const allUsers = [...allUsersA, userBankB];
  for (const user of allUsers) {
    const hashed = await hashPassword(TEST_PASSWORD);
    await prisma.account.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: hashed,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
  console.log(
    `    ✓ Created ${allUsers.length} auth accounts (password: ${TEST_PASSWORD})`,
  );

  // ─── 4. Create Branches ─────────────────────────────────────────────

  console.log("  Creating branches...");

  const branchData = [
    {
      code: "BR001",
      name: "Head Office",
      city: "Pune",
      state: "Maharashtra",
      type: "Head Office",
    },
    {
      code: "BR002",
      name: "Kothrud Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
    {
      code: "BR003",
      name: "Shivajinagar Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
    {
      code: "BR004",
      name: "Camp Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
    {
      code: "BR005",
      name: "Kasar Sai Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
    {
      code: "BR006",
      name: "Chinchwad Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
    {
      code: "BR007",
      name: "Pimpri Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
    {
      code: "BR008",
      name: "Bibvewadi Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
    {
      code: "BR009",
      name: "Kondhwa Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
    {
      code: "BR010",
      name: "Hadapsar Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
    {
      code: "BR011",
      name: "Viman Nagar Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
    {
      code: "BR012",
      name: "Wanowrie Branch",
      city: "Pune",
      state: "Maharashtra",
      type: "Branch",
    },
  ];

  const branches = await Promise.all(
    branchData.map((b) =>
      prisma.branch.create({
        data: { ...b, tenantId: tenantA.id },
      }),
    ),
  );

  // Test Bank B branch
  const branchB = await prisma.branch.create({
    data: {
      code: "TB001",
      name: "Test Bank HQ",
      city: "Bengaluru",
      state: "Karnataka",
      type: "Head Office",
      tenantId: tenantB.id,
    },
  });

  console.log(`    ✓ Created ${branches.length} branches for Tenant A`);

  // ─── 5. Create Audit Areas ──────────────────────────────────────────

  console.log("  Creating audit areas...");

  const auditAreaData = [
    {
      name: "Credit Risk",
      description: "Credit appraisal, sanctioning, monitoring and recovery",
      riskCategory: "HIGH",
    },
    {
      name: "Operational Risk",
      description: "Cash management, reconciliation, and operational processes",
      riskCategory: "MEDIUM",
    },
    {
      name: "Compliance",
      description: "Regulatory compliance with RBI circulars and PMLA",
      riskCategory: "HIGH",
    },
    {
      name: "IT Systems",
      description: "Information security, CBS, and IT infrastructure",
      riskCategory: "HIGH",
    },
    {
      name: "Treasury",
      description: "Investment portfolio, SLR/CRR maintenance",
      riskCategory: "MEDIUM",
    },
    {
      name: "Deposit Operations",
      description: "Deposit mobilization, interest rate compliance",
      riskCategory: "LOW",
    },
    {
      name: "Governance",
      description: "Board oversight, committee functioning, policy adherence",
      riskCategory: "MEDIUM",
    },
  ];

  const auditAreas = await Promise.all(
    auditAreaData.map((a) =>
      prisma.auditArea.create({
        data: { ...a, tenantId: tenantA.id },
      }),
    ),
  );

  // Map area names to IDs for later reference
  const areaMap = new Map<string, string>();
  auditAreas.forEach((a) => areaMap.set(a.name, a.id));

  // Test Bank B audit area
  await prisma.auditArea.create({
    data: {
      name: "General Audit",
      description: "General audit area for testing",
      tenantId: tenantB.id,
    },
  });

  console.log(`    ✓ Created ${auditAreas.length} audit areas for Tenant A`);

  // ─── 6. Create RBI Circulars (global — no tenantId) ─────────────────

  console.log("  Creating RBI circulars...");

  const circularData = [
    {
      circularNumber: "RBI/2023-24/117",
      title: "Revised Basel III Capital Guidelines for UCBs",
      issuedDate: new Date("2023-10-20"),
    },
    {
      circularNumber: "RBI/2022-23/153",
      title: "Cyber Security Framework for UCBs",
      issuedDate: new Date("2022-12-15"),
    },
    {
      circularNumber: "RBI/2021-22/108",
      title: "Asset Liability Management Guidelines for UCBs",
      issuedDate: new Date("2021-09-30"),
    },
    {
      circularNumber: "RBI/2023-24/075",
      title: "KYC/AML Compliance for Co-operative Banks",
      issuedDate: new Date("2023-07-15"),
    },
    {
      circularNumber: "RBI/2024-25/012",
      title: "Priority Sector Lending Targets for UCBs",
      issuedDate: new Date("2024-04-10"),
    },
    {
      circularNumber: "RBI/2023-24/089",
      title: "Income Recognition and NPA Guidelines for UCBs",
      issuedDate: new Date("2023-08-20"),
    },
    {
      circularNumber: "RBI/2024-25/045",
      title: "Governance Standards for Urban Co-operative Banks",
      issuedDate: new Date("2024-06-15"),
    },
    {
      circularNumber: "RBI/2022-23/178",
      title: "Deposits and Interest Rate Guidelines",
      issuedDate: new Date("2023-02-10"),
    },
  ];

  const circulars = await Promise.all(
    circularData.map((c) => prisma.rbiCircular.create({ data: c })),
  );

  const circularMap = new Map<string, string>();
  circulars.forEach((c) => circularMap.set(c.circularNumber, c.id));

  console.log(`    ✓ Created ${circulars.length} RBI circulars (global)`);

  // ─── 7. Create Audit Plans with Indian Fiscal Year Quarters (D16) ───

  console.log("  Creating audit plans...");

  const auditPlanConfigs = [
    {
      year: 2025,
      quarter: Quarter.Q2_JUL_SEP,
      status: AuditPlanStatus.COMPLETED,
      startDate: "2025-07-15",
      endDate: "2025-09-30",
    },
    {
      year: 2025,
      quarter: Quarter.Q3_OCT_DEC,
      status: AuditPlanStatus.IN_PROGRESS,
      startDate: "2025-10-01",
      endDate: "2025-12-31",
    },
    {
      year: 2025,
      quarter: Quarter.Q4_JAN_MAR,
      status: AuditPlanStatus.PLANNED,
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    },
    {
      year: 2026,
      quarter: Quarter.Q1_APR_JUN,
      status: AuditPlanStatus.PLANNED,
      startDate: "2026-04-01",
      endDate: "2026-06-30",
    },
  ];

  const auditPlans = await Promise.all(
    auditPlanConfigs.map((ap) =>
      prisma.auditPlan.create({
        data: {
          tenantId: tenantA.id,
          year: ap.year,
          quarter: ap.quarter,
          status: ap.status,
          startDate: new Date(ap.startDate),
          endDate: new Date(ap.endDate),
        },
      }),
    ),
  );

  // Test Bank B audit plan
  await prisma.auditPlan.create({
    data: {
      tenantId: tenantB.id,
      year: 2025,
      quarter: Quarter.Q3_OCT_DEC,
      status: AuditPlanStatus.PLANNED,
    },
  });

  console.log(`    ✓ Created ${auditPlans.length} audit plans for Tenant A`);

  // ─── 8. Create Audit Engagements ────────────────────────────────────

  console.log("  Creating audit engagements...");

  // Map branch codes to IDs
  const branchMap = new Map<string, string>();
  branches.forEach((b) => branchMap.set(b.code, b.id));

  const engagementData = [
    // Q2 2025 (completed)
    {
      planIdx: 0,
      branchCode: "BR002",
      area: "Credit Risk",
      status: EngagementStatus.COMPLETED,
      assignedTo: userCAE.id,
    },
    {
      planIdx: 0,
      branchCode: "BR004",
      area: "Operational Risk",
      status: EngagementStatus.COMPLETED,
      assignedTo: userAuditor.id,
    },
    // Q3 2025 (in progress)
    {
      planIdx: 1,
      branchCode: "BR001",
      area: "IT Systems",
      status: EngagementStatus.IN_PROGRESS,
      assignedTo: userAuditee.id,
    },
    {
      planIdx: 1,
      branchCode: "BR001",
      area: "Credit Risk",
      status: EngagementStatus.IN_PROGRESS,
      assignedTo: userCAE.id,
    },
    {
      planIdx: 1,
      branchCode: "BR007",
      area: "Treasury",
      status: EngagementStatus.PLANNED,
      assignedTo: userAuditor.id,
    },
    // Q4 2025 (planned)
    {
      planIdx: 2,
      branchCode: "BR001",
      area: "Compliance",
      status: EngagementStatus.PLANNED,
      assignedTo: userCCO.id,
    },
    {
      planIdx: 2,
      branchCode: "BR001",
      area: "Governance",
      status: EngagementStatus.PLANNED,
      assignedTo: userCAE.id,
    },
  ];

  let engagementCount = 0;
  for (const eng of engagementData) {
    await prisma.auditEngagement.create({
      data: {
        auditPlanId: auditPlans[eng.planIdx].id,
        tenantId: tenantA.id,
        branchId: branchMap.get(eng.branchCode) ?? null,
        auditAreaId: areaMap.get(eng.area) ?? null,
        assignedToId: eng.assignedTo,
        status: eng.status,
      },
    });
    engagementCount++;
  }

  console.log(
    `    ✓ Created ${engagementCount} audit engagements for Tenant A`,
  );

  // ─── 9. Create Compliance Requirements ──────────────────────────────

  console.log("  Creating compliance requirements...");

  // Map category IDs from demo data to RBI circular references
  const categoryToCircular: Record<string, string> = {
    "market-risk": "RBI/2023-24/117",
    "credit-risk": "RBI/2023-24/089",
    "kyc-aml": "RBI/2023-24/075",
    "it-security": "RBI/2022-23/153",
    governance: "RBI/2024-25/045",
    psl: "RBI/2024-25/012",
    alm: "RBI/2021-22/108",
    deposit: "RBI/2022-23/178",
  };

  // Load compliance data
  const complianceJson =
    await import("../src/data/demo/compliance-requirements.json");
  const complianceReqs = complianceJson.complianceRequirements;

  // Assign owner based on category
  const categoryOwnerMap: Record<string, string> = {
    "market-risk": userCCO.id,
    "credit-risk": userAuditor.id,
    "kyc-aml": userCCO.id,
    "it-security": userAuditee.id,
    governance: userCEO.id,
    psl: userAuditor.id,
    alm: userCCO.id,
    deposit: userAuditor.id,
    operations: userCAE.id,
    treasury: userAuditor.id,
  };

  let complianceCount = 0;
  for (const req of complianceReqs) {
    const circularRef = categoryToCircular[req.categoryId];
    await prisma.complianceRequirement.create({
      data: {
        tenantId: tenantA.id,
        requirement: `${req.title}: ${req.description}`,
        category: req.categoryId,
        status: mapComplianceStatus(req.status),
        rbiCircularId: circularRef
          ? (circularMap.get(circularRef) ?? null)
          : null,
        nextReviewDate: req.nextReviewDate
          ? new Date(req.nextReviewDate)
          : null,
        ownerId: categoryOwnerMap[req.categoryId] ?? userCCO.id,
      },
    });
    complianceCount++;
  }

  // Test Bank B compliance req
  await prisma.complianceRequirement.create({
    data: {
      tenantId: tenantB.id,
      requirement: "Maintain CRAR >= 9%",
      category: "market-risk",
      status: ComplianceStatus.PENDING,
      ownerId: userBankB.id,
    },
  });

  console.log(
    `    ✓ Created ${complianceCount} compliance requirements for Tenant A`,
  );

  // ─── 10. Create Observations (Findings) ─────────────────────────────

  console.log("  Creating observations...");

  const findingsJson = await import("../src/data/demo/findings.json");
  const findings = findingsJson.findings;

  // Map finding categories to audit area names
  const categoryToArea: Record<string, string> = {
    "Capital Adequacy": "Compliance",
    "Asset Liability Management": "Treasury",
    "Cyber Security": "IT Systems",
    "Credit Risk": "Credit Risk",
    Operations: "Operational Risk",
    Governance: "Governance",
    Treasury: "Treasury",
    "Deposit Operations": "Deposit Operations",
    "Priority Sector Lending": "Credit Risk",
  };

  // Assign auditors cyclically
  const auditorPool = [userCAE.id, userAuditor.id, userAuditee.id];

  let obsCount = 0;
  for (let i = 0; i < findings.length; i++) {
    const f = findings[i];
    const areaName = categoryToArea[f.category] ?? "Operational Risk";
    const assignedToId = auditorPool[i % auditorPool.length];

    // Assign to a branch based on index
    const branchIdx = i % branches.length;

    const observation = await prisma.observation.create({
      data: {
        tenantId: tenantA.id,
        title: f.title,
        condition: f.observation,
        criteria: f.riskImpact,
        cause: f.rootCause,
        effect: f.riskImpact,
        recommendation: f.actionPlan,
        severity: mapSeverity(f.severity),
        status: mapObservationStatus(f.status),
        assignedToId,
        branchId: branches[branchIdx].id,
        auditAreaId: areaMap.get(areaName) ?? auditAreas[0].id,
        createdById: userCAE.id,
        dueDate: f.targetDate ? new Date(f.targetDate) : null,
        statusUpdatedAt: new Date(f.updatedAt),
      },
    });

    // Create timeline events for this observation
    if (f.timeline && f.timeline.length > 0) {
      for (const tl of f.timeline) {
        await prisma.observationTimeline.create({
          data: {
            observationId: observation.id,
            tenantId: tenantA.id,
            event: tl.action,
            createdById: userCAE.id, // Simplified — assign to CAE
            createdAt: new Date(tl.date),
          },
        });
      }
    }

    obsCount++;
  }

  // Test Bank B observation
  await prisma.observation.create({
    data: {
      tenantId: tenantB.id,
      title: "Test Bank Finding — Cash Reserve",
      condition: "CRR maintenance below threshold",
      criteria: "RBI minimum CRR requirement",
      cause: "Liquidity management gap",
      effect: "Regulatory penalty risk",
      recommendation: "Improve daily CRR monitoring",
      severity: Severity.MEDIUM,
      status: ObservationStatus.DRAFT,
      branchId: branchB.id,
      createdById: userBankB.id,
    },
  });

  console.log(
    `    ✓ Created ${obsCount} observations with timeline events for Tenant A`,
  );

  // ─── Summary ────────────────────────────────────────────────────────

  console.log("\n✅ Seed complete!\n");
  console.log("  Tenant A (Apex Sahakari Bank):");
  console.log(`    - ${allUsersA.length} users (2 multi-role)`);
  console.log(`    - ${branches.length} branches`);
  console.log(`    - ${auditAreas.length} audit areas`);
  console.log(
    `    - ${auditPlans.length} audit plans (Indian fiscal quarters)`,
  );
  console.log(`    - ${engagementCount} audit engagements`);
  console.log(`    - ${complianceCount} compliance requirements`);
  console.log(`    - ${obsCount} observations with timeline events`);
  console.log("  Tenant B (Test Nagari Sahakari Bank):");
  console.log("    - 1 user (CEO+CAE dual role)");
  console.log("    - 1 branch, 1 audit area, 1 audit plan");
  console.log("    - 1 compliance requirement, 1 observation");
  console.log(`\n  Global: ${circulars.length} RBI circulars\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
