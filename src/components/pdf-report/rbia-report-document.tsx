/**
 * RBIA Audit Report PDF Document (Phase 23 -- REPT-04)
 *
 * 8-section PDF document using @react-pdf/renderer for complete RBIA audit reports.
 * The PDF is the complete audit record -- board members and regulators should not need
 * app access to understand the audit. Score-first structure per RBI RBIA policy.
 *
 * Sections:
 *   1. Cover Page (bank branding, branch, rating band)
 *   2. Executive Summary (composite score, finding counts, worst module)
 *   3. Engagement Details (branch info, team, plan reference, score frozen by)
 *   4. Score Summary (circular gauge + module scores table)
 *   5. Detailed Scores (per-module drill-down from scoring tree snapshot)
 *   6. ActionPoints Summary (table with BM responses)
 *   7. Observations (formal 5C findings)
 *   8. Meeting Minutes (opening + exit meetings)
 */

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  Circle,
} from "@react-pdf/renderer";
import type { RbiaReportData } from "@/data-access/rbia-report";

// ─── Rating Band Color Map ──────────────────────────────────────────────────

const RATING_COLORS: Record<string, string> = {
  VERY_GOOD: "#166534",
  GOOD: "#1d4ed8",
  SATISFACTORY: "#ca8a04",
  MODERATE: "#ea580c",
  POOR: "#dc2626",
};

function getRatingColor(ratingBand: string): string {
  return RATING_COLORS[ratingBand] ?? "#64748b";
}

function formatRatingBand(band: string): string {
  return band.replace(/_/g, " ");
}

function formatDate(date: Date | string | null): string {
  if (!date) return "N/A";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Module-level StyleSheet (performance -- computed once, not per render) ─

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  // Cover Page
  coverPage: {
    padding: 60,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  bankName: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    marginBottom: 8,
    textAlign: "center",
  },
  bankSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 40,
    textAlign: "center",
  },
  reportTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: "#1E40AF",
    marginBottom: 8,
    textAlign: "center",
  },
  branchLabel: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
    textAlign: "center",
  },
  periodLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 30,
    textAlign: "center",
  },
  divider: {
    width: 120,
    height: 2,
    backgroundColor: "#1E40AF",
    marginBottom: 30,
  },
  ratingBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 4,
    marginBottom: 40,
  },
  ratingBadgeText: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
    textAlign: "center",
  },
  confidential: {
    fontSize: 10,
    fontFamily: "Helvetica-BoldOblique",
    color: "#DC2626",
    marginBottom: 6,
    textAlign: "center",
  },
  notice: {
    fontSize: 8,
    color: "#9CA3AF",
    textAlign: "center",
    maxWidth: 300,
  },
  coverFooter: {
    position: "absolute",
    bottom: 40,
    fontSize: 8,
    color: "#9CA3AF",
  },

  // Section styles
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    color: "#1E40AF",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 4,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: "35%",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  value: {
    width: "65%",
    fontSize: 10,
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.6,
    marginBottom: 8,
  },

  // Table styles
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    padding: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#000",
  },
  tableRow: {
    flexDirection: "row",
    padding: 6,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableRowAlt: {
    flexDirection: "row",
    padding: 6,
    fontSize: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },

  // Score gauge container
  gaugeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    marginTop: 8,
  },
  gaugeLabel: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 4,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#64748b",
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 10,
  },

  // Severity badges
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },

  // Detailed Scores - tree indentation
  treeItem: {
    flexDirection: "row",
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },

  // Observation block
  observationBlock: {
    marginBottom: 14,
    borderLeftWidth: 3,
    borderLeftColor: "#1E40AF",
    paddingLeft: 10,
  },
  observationTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  observationField: {
    marginBottom: 4,
  },
  observationFieldLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  observationFieldValue: {
    fontSize: 9,
    lineHeight: 1.5,
    color: "#1F2937",
  },

  // Meeting block
  meetingBlock: {
    marginBottom: 14,
    padding: 10,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  meetingType: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1E40AF",
    marginBottom: 6,
  },
});

// ─── Severity Colors ────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#ca8a04",
  LOW: "#22c55e",
};

// ─── PdfScoreGauge (SVG Circle arc for PDF) ─────────────────────────────────

interface PdfScoreGaugeProps {
  percentage: number;
  color: string;
  size?: number;
}

function PdfScoreGauge({ percentage, color, size = 100 }: PdfScoreGaugeProps) {
  const center = size / 2;
  const radius = center - 10;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * (percentage / 100);
  const gapLength = circumference - arcLength;

  return (
    <View style={{ width: size, height: size, alignItems: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring */}
        <Circle
          cx={String(center)}
          cy={String(center)}
          r={String(radius)}
          stroke="#e2e8f0"
          strokeWidth="8"
          fill="none"
        />
        {/* Foreground arc */}
        <Circle
          cx={String(center)}
          cy={String(center)}
          r={String(radius)}
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={`${arcLength} ${gapLength}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ transform: `rotate(-90 ${center} ${center})` } as any)}
        />
      </Svg>
      {/* Center text overlay - absolute position inside SVG container */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: size,
          height: size,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontFamily: "Helvetica-Bold",
            color,
          }}
        >
          {Math.round(percentage)}%
        </Text>
      </View>
    </View>
  );
}

// ─── Section 1: Cover Page ──────────────────────────────────────────────────

function CoverPageSection({ data }: { data: RbiaReportData }) {
  const { engagement, branchScore } = data;
  const ratingBand = branchScore?.ratingBand ?? "N/A";
  const ratingColor = getRatingColor(ratingBand);
  const branchName = engagement.branch?.name ?? "Unknown Branch";
  const branchCode = engagement.branch?.code ?? "";
  const bankName = engagement.tenant.name;
  const periodFrom = formatDate(engagement.periodFrom);
  const periodTo = formatDate(engagement.periodTo);

  return (
    <Page size="A4" style={styles.coverPage}>
      <Text style={styles.bankName}>{bankName}</Text>
      <Text style={styles.bankSubtitle}>Internal Audit Department</Text>

      <View style={styles.divider} />

      <Text style={styles.reportTitle}>RBIA Audit Report</Text>
      <Text style={styles.branchLabel}>
        {branchName} ({branchCode})
      </Text>
      <Text style={styles.periodLabel}>
        {periodFrom} to {periodTo}
      </Text>

      {/* Rating band badge */}
      <View style={[styles.ratingBadge, { backgroundColor: ratingColor }]}>
        <Text style={styles.ratingBadgeText}>
          {formatRatingBand(ratingBand)}
        </Text>
      </View>

      <Text style={styles.confidential}>CONFIDENTIAL</Text>
      <Text style={styles.notice}>
        This document is confidential and intended solely for the Board of
        Directors, Audit Committee, and authorized regulatory bodies.
        Unauthorized distribution is prohibited.
      </Text>

      <Text style={styles.coverFooter}>
        Generated by AEGIS Audit System on {new Date().toLocaleString("en-IN")}
      </Text>
    </Page>
  );
}

// ─── Section 2: Executive Summary ───────────────────────────────────────────

function ExecutiveSummarySection({ data }: { data: RbiaReportData }) {
  const { engagement, branchScore, actionPoints, observations } = data;
  const branchName = engagement.branch?.name ?? "the branch";
  const periodFrom = formatDate(engagement.periodFrom);
  const periodTo = formatDate(engagement.periodTo);
  const compositeScore = branchScore
    ? Math.round(branchScore.compositeScore * 100)
    : 0;
  const ratingBand = branchScore
    ? formatRatingBand(branchScore.ratingBand)
    : "Not Scored";

  // Find worst-performing module
  let worstModule = "N/A";
  if (branchScore?.moduleScores) {
    const modules = Object.entries(branchScore.moduleScores);
    if (modules.length > 0) {
      const worst = modules.reduce((min, curr) =>
        curr[1] < min[1] ? curr : min,
      );
      worstModule = `${worst[0]} (${Math.round(worst[1] * 100)}%)`;
    }
  }

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>2. Executive Summary</Text>

      <Text style={styles.bodyText}>
        The RBIA audit of {branchName} was conducted from {periodFrom} to{" "}
        {periodTo}. The composite RBIA score is {compositeScore}% ({ratingBand}
        ).
      </Text>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Total Action Points:</Text>
          <Text style={styles.value}>{actionPoints.length}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Formal Observations:</Text>
          <Text style={styles.value}>{observations.length}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Findings:</Text>
          <Text style={styles.value}>
            {actionPoints.length} Action Points and {observations.length} formal
            Observations
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Worst Performing Module:</Text>
          <Text style={styles.value}>{worstModule}</Text>
        </View>
      </View>

      {/* Severity distribution of ActionPoints */}
      {actionPoints.length > 0 && (
        <View style={styles.section}>
          <Text
            style={{
              fontSize: 11,
              fontFamily: "Helvetica-Bold",
              marginBottom: 6,
            }}
          >
            ActionPoint Severity Distribution
          </Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ width: "40%" }}>Severity</Text>
              <Text style={{ width: "30%" }}>Count</Text>
              <Text style={{ width: "30%" }}>Percentage</Text>
            </View>
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(
              (severity) => {
                const count = actionPoints.filter(
                  (ap) => ap.severity === severity,
                ).length;
                const pct =
                  actionPoints.length > 0
                    ? ((count / actionPoints.length) * 100).toFixed(1)
                    : "0.0";
                return (
                  <View key={severity} style={styles.tableRow}>
                    <Text style={{ width: "40%" }}>{severity}</Text>
                    <Text style={{ width: "30%" }}>{count}</Text>
                    <Text style={{ width: "30%" }}>{pct}%</Text>
                  </View>
                );
              },
            )}
          </View>
        </View>
      )}

      <Text style={styles.footer}>
        RBIA Audit Report | {engagement.tenant.name} | Page 2
      </Text>
    </Page>
  );
}

// ─── Section 3: Engagement Details ──────────────────────────────────────────

function EngagementDetailsSection({ data }: { data: RbiaReportData }) {
  const { engagement, branchScore } = data;
  const branch = engagement.branch;

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>3. Engagement Details</Text>

      {/* Branch Info */}
      <View style={styles.section}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Helvetica-Bold",
            marginBottom: 6,
          }}
        >
          Branch Information
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Branch Name:</Text>
          <Text style={styles.value}>{branch?.name ?? "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Branch Code:</Text>
          <Text style={styles.value}>{branch?.code ?? "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Branch Type:</Text>
          <Text style={styles.value}>{branch?.type ?? "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Category:</Text>
          <Text style={styles.value}>{branch?.category ?? "N/A"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Zone:</Text>
          <Text style={styles.value}>{branch?.zone?.name ?? "N/A"}</Text>
        </View>
      </View>

      {/* Audit Team */}
      <View style={styles.section}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Helvetica-Bold",
            marginBottom: 6,
          }}
        >
          Audit Team
        </Text>
        {engagement.teamMembers.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ width: "50%" }}>Name</Text>
              <Text style={{ width: "50%" }}>Role</Text>
            </View>
            {engagement.teamMembers.map((member, idx) => (
              <View
                key={idx}
                style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
              >
                <Text style={{ width: "50%" }}>{member.user.name}</Text>
                <Text style={{ width: "50%" }}>
                  {member.roleInEngagement.replace(/_/g, " ")}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.bodyText}>No team members assigned.</Text>
        )}
      </View>

      {/* Plan Reference */}
      <View style={styles.section}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Helvetica-Bold",
            marginBottom: 6,
          }}
        >
          Plan Reference
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Audit Number:</Text>
          <Text style={styles.value}>
            {engagement.auditNumber ?? "Not assigned"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Plan Year:</Text>
          <Text style={styles.value}>{engagement.auditPlan.year}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Plan Quarter:</Text>
          <Text style={styles.value}>
            {engagement.auditPlan.quarter.replace(/_/g, " ")}
          </Text>
        </View>
      </View>

      {/* Score Frozen By */}
      <View style={styles.section}>
        <Text
          style={{
            fontSize: 11,
            fontFamily: "Helvetica-Bold",
            marginBottom: 6,
          }}
        >
          Score Authorization
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Score Frozen By:</Text>
          <Text style={styles.value}>
            {branchScore?.frozenByName ?? "Not frozen"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Frozen At:</Text>
          <Text style={styles.value}>
            {formatDate(branchScore?.frozenAt ?? null)}
          </Text>
        </View>
      </View>

      <Text style={styles.footer}>
        RBIA Audit Report | {engagement.tenant.name} | Page 3
      </Text>
    </Page>
  );
}

// ─── Section 4: Score Summary ───────────────────────────────────────────────

function ScoreSummarySection({ data }: { data: RbiaReportData }) {
  const { engagement, branchScore } = data;

  if (!branchScore) {
    return (
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>4. Score Summary</Text>
        <Text style={styles.bodyText}>
          No RBIA score has been computed for this engagement.
        </Text>
        <Text style={styles.footer}>
          RBIA Audit Report | {engagement.tenant.name} | Page 4
        </Text>
      </Page>
    );
  }

  const compositePercentage = Math.round(branchScore.compositeScore * 100);
  const ratingColor = getRatingColor(branchScore.ratingBand);

  // Parse module scores for the table
  const moduleEntries = Object.entries(branchScore.moduleScores).sort(
    ([, a], [, b]) => b - a,
  );

  // Determine rating band for each module score
  function getModuleRatingBand(score: number): string {
    const pct = score * 100;
    if (pct > 80) return "VERY_GOOD";
    if (pct > 65) return "GOOD";
    if (pct > 50) return "SATISFACTORY";
    if (pct > 40) return "MODERATE";
    return "POOR";
  }

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>4. Score Summary</Text>

      {/* Circular gauge */}
      <View style={styles.gaugeContainer}>
        <View style={{ alignItems: "center" }}>
          <PdfScoreGauge
            percentage={compositePercentage}
            color={ratingColor}
            size={120}
          />
          <Text style={styles.gaugeLabel}>
            Composite Score: {compositePercentage}% (
            {formatRatingBand(branchScore.ratingBand)})
          </Text>
        </View>
      </View>

      {/* Module scores table */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={{ width: "25%" }}>Module Code</Text>
          <Text style={{ width: "30%" }}>Score %</Text>
          <Text style={{ width: "25%" }}>Rating Band</Text>
          <Text style={{ width: "20%" }}>Status</Text>
        </View>
        {moduleEntries.map(([code, score], idx) => {
          const pct = Math.round(score * 100);
          const band = getModuleRatingBand(score);
          const bandColor = getRatingColor(band);
          return (
            <View
              key={code}
              style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
            >
              <Text style={{ width: "25%", fontFamily: "Helvetica-Bold" }}>
                {code}
              </Text>
              <Text style={{ width: "30%" }}>{pct}%</Text>
              <Text style={{ width: "25%", color: bandColor }}>
                {formatRatingBand(band)}
              </Text>
              <Text style={{ width: "20%" }}>
                {pct >= 65 ? "Pass" : "Needs Attention"}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.footer}>
        RBIA Audit Report | {engagement.tenant.name} | Page 4
      </Text>
    </Page>
  );
}

// ─── Section 5: Detailed Scores (placeholder -- completed in Task 2b) ──────

// TODO: Section 5 - Detailed Scores (scoring tree drill-down)

// ─── Section 6: ActionPoints Summary (placeholder -- completed in Task 2b) ──

// TODO: Section 6 - ActionPoints Summary

// ─── Section 7: Observations (placeholder -- completed in Task 2b) ──────────

// TODO: Section 7 - Observations (5C formal findings)

// ─── Section 8: Meeting Minutes (placeholder -- completed in Task 2b) ───────

// TODO: Section 8 - Meeting Minutes

// ─── Main Document Component ────────────────────────────────────────────────

interface RbiaReportDocumentProps {
  data: RbiaReportData;
}

export function RbiaReportDocument({ data }: RbiaReportDocumentProps) {
  return (
    <Document>
      <CoverPageSection data={data} />
      <ExecutiveSummarySection data={data} />
      <EngagementDetailsSection data={data} />
      <ScoreSummarySection data={data} />
      {/* Sections 5-8 will be added in Task 2b */}
    </Document>
  );
}
