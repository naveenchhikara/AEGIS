"use server";

import { z } from "zod";
import ExcelJS from "exceljs";
import { getRequiredSession } from "@/data-access/session";
import { prismaForTenant } from "@/data-access/prisma";
import { hasPermission, type Role } from "@/lib/permissions";
import { logger } from "@/lib/logger";

/**
 * Generate one-click RBI inspection support pack (R86).
 * Aggregates 9 components for comprehensive RBI inspection readiness.
 */
const YearSchema = z.number().int().min(2000).max(2100);

export async function generateInspectionPack(year: number) {
  if (!YearSchema.safeParse(year).success)
    return { success: false as const, error: "Invalid year." };
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  if (!hasPermission(userRoles, "board:reporting")) {
    return {
      success: false as const,
      error: "You do not have permission to generate inspection packs.",
    };
  }

  const db = prismaForTenant(tenantId);

  try {
    const startDate = new Date(year, 3, 1); // April 1st (Indian FY start)
    const endDate = new Date(year + 1, 2, 31); // March 31st

    // Component 1: Branch Audit Coverage Report
    const auditCoverage = await db.auditEngagement.findMany({
      where: {
        tenantId,
        scheduledStartDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        branch: {
          select: { code: true, name: true },
        },
      },
      orderBy: { scheduledStartDate: "desc" },
    });

    // Component 2: RAM Assessment Summary
    const ramSummary = await db.ramAssessment.findMany({
      where: { tenantId },
      include: {
        branch: {
          select: { code: true, name: true },
        },
      },
      orderBy: { computedAt: "desc" },
      take: 100,
    });

    // Component 3: Open Observations Summary
    const openObs = await db.observation.findMany({
      where: {
        tenantId,
        status: { notIn: ["CLOSED"] },
      },
      include: {
        branch: {
          select: { code: true, name: true },
        },
      },
      orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
    });

    // Component 4: Compliance Status Report
    const compliance = await db.complianceItem.findMany({
      where: { tenantId },
      include: {
        branch: {
          select: { code: true, name: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Component 5: Regulatory Observation ATR Status
    const regObs = await db.regulatoryObservation.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });

    // Component 6: Risk Register Summary
    const risks = await db.riskRegister.findMany({
      where: { tenantId },
      orderBy: { residualScore: "desc" },
      take: 50,
    });

    // Component 7: KRI Breach Report
    const kris = await db.keyRiskIndicator.findMany({
      where: {
        tenantId,
        breachStatus: "BREACH",
      },
      orderBy: { lastUpdated: "desc" },
      take: 50,
    });

    // Component 8: Policy Review Status
    const policies = await db.policyDocument.findMany({
      where: { tenantId },
      orderBy: [{ category: "asc" }, { reviewDueDate: "asc" }],
    });

    // Component 9: IS Audit Status
    const isAudits = await db.isAuditChecklist.findMany({
      where: { tenantId },
      include: {
        engagement: {
          select: {
            branch: { select: { code: true, name: true } },
          },
        },
      },
      orderBy: { completedAt: "desc" },
    });

    // Summary stats
    const stats = {
      totalBranches: await db.branch.count({ where: { tenantId } }),
      totalAudits: auditCoverage.length,
      completedAudits: auditCoverage.filter((a) => a.status === "COMPLETED")
        .length,
      criticalObservations: openObs.filter((o) => o.severity === "CRITICAL")
        .length,
      highObservations: openObs.filter((o) => o.severity === "HIGH").length,
      overdueCompliance: compliance.filter(
        (c) =>
          c.dueDate < new Date() &&
          !["CLOSED", "ZAC_APPROVED"].includes(c.status),
      ).length,
      activeRisks: risks.filter((r) => r.status === "OPEN").length,
      kriBreach: kris.length,
      policiesDueReview: policies.filter(
        (p) =>
          p.reviewDueDate &&
          p.reviewDueDate < new Date() &&
          p.status === "APPROVED",
      ).length,
    };

    return {
      success: true as const,
      data: {
        year,
        generatedAt: new Date().toISOString(),
        stats,
        auditCoverage,
        ramSummary,
        openObs,
        compliance,
        regObs,
        risks,
        kris,
        policies,
        isAudits,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate inspection pack.";
    logger.error(
      { error, action: "generate_inspection_pack", tenantId },
      message,
    );
    return { success: false as const, error: message };
  }
}

// ---------------------------------------------------------------------------
// XLSX Export — R86
// ---------------------------------------------------------------------------

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFD9E1F2" },
};

const HEADER_FONT: Partial<ExcelJS.Font> = { bold: true, size: 11 };

function styledHeaderRow(sheet: ExcelJS.Worksheet, headers: string[]) {
  const row = sheet.addRow(headers);
  row.font = HEADER_FONT;
  row.fill = HEADER_FILL;
  return row;
}

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Generate the 9-component RBI inspection pack as an XLSX workbook.
 * Returns base64-encoded buffer for client-side download.
 */
export async function generateInspectionPackXlsx(year: number) {
  // Reuse existing aggregation to get all data
  const result = await generateInspectionPack(year);

  if (!result.success) {
    return { success: false as const, error: result.error };
  }

  const data = result.data;

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "AEGIS Audit System";
    wb.created = new Date();
    wb.modified = new Date();

    // ----- Summary Sheet (first tab) -----
    {
      const ws = wb.addWorksheet("Summary");

      ws.mergeCells("A1:D1");
      ws.getCell("A1").value =
        `RBI Inspection Support Pack — FY ${year}-${(year + 1).toString().slice(2)}`;
      ws.getCell("A1").font = { bold: true, size: 16 };
      ws.getCell("A1").alignment = { horizontal: "center" };

      ws.getCell("A3").value = "Generated At:";
      ws.getCell("A3").font = { bold: true };
      ws.getCell("B3").value = fmtDate(data.generatedAt);

      const summaryRows: [string, number | string][] = [
        ["Total Branches", data.stats.totalBranches],
        ["Total Audits", data.stats.totalAudits],
        ["Completed Audits", data.stats.completedAudits],
        ["Critical Observations", data.stats.criticalObservations],
        ["High Observations", data.stats.highObservations],
        ["Overdue Compliance Items", data.stats.overdueCompliance],
        ["Active Risks", data.stats.activeRisks],
        ["KRI Breaches", data.stats.kriBreach],
        ["Policies Due for Review", data.stats.policiesDueReview],
      ];

      let row = 5;
      summaryRows.forEach(([label, value]) => {
        ws.getCell(`A${row}`).value = label;
        ws.getCell(`A${row}`).font = { bold: true };
        ws.getCell(`B${row}`).value = value;
        row++;
      });

      ws.getColumn("A").width = 30;
      ws.getColumn("B").width = 20;
    }

    // ----- Sheet 1: Audit Coverage -----
    {
      const ws = wb.addWorksheet("1. Audit Coverage");
      styledHeaderRow(ws, [
        "Branch Code",
        "Branch Name",
        "Audit Type",
        "Status",
        "Scheduled Start",
        "Completion Date",
      ]);
      data.auditCoverage.forEach((a: any) => {
        ws.addRow([
          a.branch?.code || "—",
          a.branch?.name || "—",
          a.auditType || "—",
          a.status,
          fmtDate(a.scheduledStartDate),
          fmtDate(a.completionDate),
        ]);
      });
      ws.getColumn(1).width = 14;
      ws.getColumn(2).width = 30;
      ws.getColumn(3).width = 16;
      ws.getColumn(4).width = 16;
      ws.getColumn(5).width = 18;
      ws.getColumn(6).width = 18;
    }

    // ----- Sheet 2: RAM Summary -----
    {
      const ws = wb.addWorksheet("2. RAM Summary");
      styledHeaderRow(ws, [
        "Branch Code",
        "Branch Name",
        "Assessment Year",
        "Composite Score",
        "Risk Category",
        "Audit Frequency (months)",
        "Computed At",
      ]);
      data.ramSummary.forEach((r: any) => {
        ws.addRow([
          r.branch?.code || "—",
          r.branch?.name || "—",
          r.assessmentYear || "—",
          r.compositeScore != null ? Number(r.compositeScore) : "—",
          r.riskCategory || "—",
          r.auditFrequency ?? "—",
          fmtDate(r.computedAt),
        ]);
      });
      ws.getColumn(1).width = 14;
      ws.getColumn(2).width = 30;
      ws.getColumn(3).width = 18;
      ws.getColumn(4).width = 16;
      ws.getColumn(5).width = 16;
      ws.getColumn(6).width = 22;
      ws.getColumn(7).width = 18;
    }

    // ----- Sheet 3: Open Observations -----
    {
      const ws = wb.addWorksheet("3. Open Observations");
      styledHeaderRow(ws, [
        "Title",
        "Branch",
        "Severity",
        "Status",
        "Condition",
        "Recommendation",
        "Target Date",
        "Created At",
      ]);
      data.openObs.forEach((o: any) => {
        ws.addRow([
          o.title,
          o.branch?.name || "—",
          o.severity,
          o.status,
          o.condition || "—",
          o.recommendation || "—",
          fmtDate(o.targetDate),
          fmtDate(o.createdAt),
        ]);
      });
      ws.getColumn(1).width = 40;
      ws.getColumn(2).width = 25;
      ws.getColumn(3).width = 12;
      ws.getColumn(4).width = 14;
      ws.getColumn(5).width = 40;
      ws.getColumn(6).width = 40;
      ws.getColumn(7).width = 16;
      ws.getColumn(8).width = 16;
    }

    // ----- Sheet 4: Compliance Status -----
    {
      const ws = wb.addWorksheet("4. Compliance Status");
      styledHeaderRow(ws, [
        "Compliance Type",
        "Branch",
        "Status",
        "Due Date",
        "Escalation Level",
        "Days Open",
      ]);
      data.compliance.forEach((c: any) => {
        ws.addRow([
          c.complianceType || c.observation?.title || "—",
          c.branch?.name || "—",
          c.status,
          fmtDate(c.dueDate),
          c.escalationLevel ?? 0,
          c.daysOpen ?? 0,
        ]);
      });
      ws.getColumn(1).width = 35;
      ws.getColumn(2).width = 25;
      ws.getColumn(3).width = 18;
      ws.getColumn(4).width = 16;
      ws.getColumn(5).width = 18;
      ws.getColumn(6).width = 12;
    }

    // ----- Sheet 5: Regulatory ATR Status -----
    {
      const ws = wb.addWorksheet("5. Regulatory ATR");
      styledHeaderRow(ws, [
        "Reference No",
        "Para No",
        "Source",
        "Severity",
        "Description",
        "ATR Status",
        "Submitted At",
        "Accepted At",
      ]);
      data.regObs.forEach((r: any) => {
        ws.addRow([
          r.referenceNo || "—",
          r.paraNo || "—",
          r.source || "—",
          r.severity || "—",
          r.description || "—",
          r.atrStatus || "—",
          fmtDate(r.submittedAt),
          fmtDate(r.acceptedAt),
        ]);
      });
      ws.getColumn(1).width = 18;
      ws.getColumn(2).width = 10;
      ws.getColumn(3).width = 20;
      ws.getColumn(4).width = 12;
      ws.getColumn(5).width = 50;
      ws.getColumn(6).width = 16;
      ws.getColumn(7).width = 16;
      ws.getColumn(8).width = 16;
    }

    // ----- Sheet 6: Risk Register -----
    {
      const ws = wb.addWorksheet("6. Risk Register");
      styledHeaderRow(ws, [
        "Risk Statement",
        "Category",
        "Inherent Score",
        "Control Score",
        "Residual Score",
        "Risk Owner",
        "Status",
      ]);
      data.risks.forEach((r: any) => {
        ws.addRow([
          r.riskStatement || r.riskDescription || "—",
          r.riskCategory || "—",
          r.inherentScore != null ? Number(r.inherentScore) : "—",
          r.controlScore != null ? Number(r.controlScore) : "—",
          r.residualScore != null ? Number(r.residualScore) : "—",
          r.riskOwner || "—",
          r.status || "—",
        ]);
      });
      ws.getColumn(1).width = 50;
      ws.getColumn(2).width = 18;
      ws.getColumn(3).width = 16;
      ws.getColumn(4).width = 16;
      ws.getColumn(5).width = 16;
      ws.getColumn(6).width = 20;
      ws.getColumn(7).width = 14;
    }

    // ----- Sheet 7: KRI Breaches -----
    {
      const ws = wb.addWorksheet("7. KRI Breaches");
      styledHeaderRow(ws, [
        "KRI Name",
        "Description",
        "Current Value",
        "Threshold Low",
        "Threshold High",
        "Breach Status",
        "Frequency",
        "Last Updated",
      ]);
      data.kris.forEach((k: any) => {
        ws.addRow([
          k.name || k.kriName || "—",
          k.description || "—",
          k.currentValue != null
            ? Number(k.currentValue)
            : (k.actualValue ?? "—"),
          k.thresholdLow != null
            ? Number(k.thresholdLow)
            : (k.threshold ?? "—"),
          k.thresholdHigh != null ? Number(k.thresholdHigh) : "—",
          k.breachStatus || "BREACH",
          k.frequency || "—",
          fmtDate(k.lastUpdated || k.recordDate),
        ]);
      });
      ws.getColumn(1).width = 30;
      ws.getColumn(2).width = 40;
      ws.getColumn(3).width = 16;
      ws.getColumn(4).width = 16;
      ws.getColumn(5).width = 16;
      ws.getColumn(6).width = 14;
      ws.getColumn(7).width = 14;
      ws.getColumn(8).width = 16;
    }

    // ----- Sheet 8: Policy Review Status -----
    {
      const ws = wb.addWorksheet("8. Policy Review");
      styledHeaderRow(ws, [
        "Policy Name",
        "Category",
        "Version",
        "Status",
        "Approval Date",
        "Review Due Date",
      ]);
      data.policies.forEach((p: any) => {
        ws.addRow([
          p.name || "—",
          p.category || "—",
          p.version || "—",
          p.status || "—",
          fmtDate(p.approvalDate),
          fmtDate(p.reviewDueDate),
        ]);
      });
      ws.getColumn(1).width = 35;
      ws.getColumn(2).width = 20;
      ws.getColumn(3).width = 10;
      ws.getColumn(4).width = 16;
      ws.getColumn(5).width = 18;
      ws.getColumn(6).width = 18;
    }

    // ----- Sheet 9: IS Audit Status -----
    {
      const ws = wb.addWorksheet("9. IS Audit Status");
      styledHeaderRow(ws, [
        "Branch",
        "Category",
        "Checklist Name",
        "Overall Rating",
        "Completed At",
      ]);
      data.isAudits.forEach((a: any) => {
        ws.addRow([
          a.engagement?.branch?.name || a.branch?.name || "—",
          a.category || "—",
          a.checklistName || "—",
          a.overallRating || "—",
          fmtDate(a.completedAt),
        ]);
      });
      ws.getColumn(1).width = 30;
      ws.getColumn(2).width = 22;
      ws.getColumn(3).width = 30;
      ws.getColumn(4).width = 22;
      ws.getColumn(5).width = 18;
    }

    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return {
      success: true as const,
      base64: buffer.toString("base64"),
      filename: `RBI-Inspection-Pack-FY${year}-${(year + 1).toString().slice(2)}.xlsx`,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate inspection pack XLSX.";
    logger.error({ error, action: "generate_inspection_pack_xlsx" }, message);
    return { success: false as const, error: message };
  }
}
