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

// ─── Section 5: Detailed Scores ─────────────────────────────────────────────

/**
 * Scoring tree node from the JSONB scoringTreeSnapshot.
 * Each node has code, name, depth, optional score/scoreLabel, children, and isCritical flag.
 */
type ScoreTreeNode = {
  code: string;
  name: string;
  depth: number;
  score?: number | null;
  scoreLabel?: string | null;
  isCritical?: boolean;
  weight?: number;
  children?: ScoreTreeNode[];
};

/**
 * Recursively flatten the scoring tree for PDF rendering with indentation.
 */
function flattenScoreTree(
  nodes: ScoreTreeNode[],
  result: Array<ScoreTreeNode & { displayDepth: number }> = [],
  baseDepth = 0,
): Array<ScoreTreeNode & { displayDepth: number }> {
  for (const node of nodes) {
    result.push({ ...node, displayDepth: baseDepth });
    if (node.children && node.children.length > 0) {
      flattenScoreTree(node.children, result, baseDepth + 1);
    }
  }
  return result;
}

function DetailedScoresSection({ data }: { data: RbiaReportData }) {
  const { engagement, branchScore } = data;

  if (!branchScore?.scoringTreeSnapshot) {
    return (
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>5. Detailed Scores</Text>
        <Text style={styles.bodyText}>
          No detailed scoring data available for this engagement.
        </Text>
        <Text style={styles.footer}>
          RBIA Audit Report | {engagement.tenant.name} | Page 5
        </Text>
      </Page>
    );
  }

  // Parse the JSONB scoring tree snapshot
  const treeNodes = branchScore.scoringTreeSnapshot as ScoreTreeNode[];
  const flatNodes = flattenScoreTree(Array.isArray(treeNodes) ? treeNodes : []);

  // Split into chunks to handle page overflow (approx 40 items per page)
  const ITEMS_PER_PAGE = 40;
  const pages: Array<Array<ScoreTreeNode & { displayDepth: number }>> = [];
  for (let i = 0; i < flatNodes.length; i += ITEMS_PER_PAGE) {
    pages.push(flatNodes.slice(i, i + ITEMS_PER_PAGE));
  }

  // If no pages (empty tree), show one page with message
  if (pages.length === 0) {
    pages.push([]);
  }

  return (
    <>
      {pages.map((pageNodes, pageIdx) => (
        <Page key={`detail-${pageIdx}`} size="A4" style={styles.page}>
          {pageIdx === 0 && (
            <Text style={styles.sectionTitle}>5. Detailed Scores</Text>
          )}
          {pageIdx > 0 && (
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Helvetica-Bold",
                color: "#6B7280",
                marginBottom: 8,
              }}
            >
              5. Detailed Scores (continued)
            </Text>
          )}

          {pageNodes.length === 0 && pageIdx === 0 ? (
            <Text style={styles.bodyText}>
              Scoring tree is empty or could not be parsed.
            </Text>
          ) : (
            pageNodes.map((node, idx) => {
              const indent = node.displayDepth * 12;
              const isModule = node.displayDepth === 0;
              const isLeaf = !node.children || node.children.length === 0;
              const scoreText =
                node.score != null ? `${Math.round(node.score * 100)}%` : "--";
              const labelText = node.scoreLabel
                ? node.scoreLabel.replace(/_/g, " ")
                : "";

              return (
                <View key={`${node.code}-${idx}`} style={styles.treeItem}>
                  <View
                    style={{
                      flexDirection: "row",
                      paddingLeft: indent,
                      flex: 1,
                    }}
                  >
                    <Text
                      style={{
                        width: "55%",
                        fontSize: isModule ? 10 : 9,
                        fontFamily: isModule ? "Helvetica-Bold" : "Helvetica",
                        color: isModule ? "#1E40AF" : "#1F2937",
                      }}
                    >
                      {node.isCritical ? "[CRITICAL] " : ""}
                      {node.code} - {node.name}
                    </Text>
                    {isLeaf && (
                      <>
                        <Text
                          style={{
                            width: "15%",
                            fontSize: 9,
                            textAlign: "right",
                          }}
                        >
                          {scoreText}
                        </Text>
                        <Text
                          style={{
                            width: "30%",
                            fontSize: 8,
                            textAlign: "right",
                            color:
                              node.scoreLabel === "NON_COMPLIANT"
                                ? "#dc2626"
                                : node.scoreLabel === "PARTIALLY_COMPLIANT"
                                  ? "#ca8a04"
                                  : "#374151",
                          }}
                        >
                          {labelText}
                        </Text>
                      </>
                    )}
                    {!isLeaf && node.score != null && (
                      <Text
                        style={{
                          width: "45%",
                          fontSize: 9,
                          textAlign: "right",
                          fontFamily: "Helvetica-Bold",
                        }}
                      >
                        {scoreText}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })
          )}

          <Text style={styles.footer}>
            RBIA Audit Report | {engagement.tenant.name} | Page {5 + pageIdx}
          </Text>
        </Page>
      ))}
    </>
  );
}

// ─── Section 6: ActionPoints Summary ────────────────────────────────────────

function ActionPointsSummarySection({ data }: { data: RbiaReportData }) {
  const { engagement, actionPoints } = data;

  if (actionPoints.length === 0) {
    return (
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>6. Action Points Summary</Text>
        <Text style={styles.bodyText}>
          No action points were raised during this engagement.
        </Text>
        <Text style={styles.footer}>
          RBIA Audit Report | {engagement.tenant.name}
        </Text>
      </Page>
    );
  }

  // Split into pages (approx 10 APs per page due to description)
  const APS_PER_PAGE = 10;
  const pages: Array<typeof actionPoints> = [];
  for (let i = 0; i < actionPoints.length; i += APS_PER_PAGE) {
    pages.push(actionPoints.slice(i, i + APS_PER_PAGE));
  }

  return (
    <>
      {pages.map((pageAps, pageIdx) => (
        <Page key={`ap-${pageIdx}`} size="A4" style={styles.page}>
          {pageIdx === 0 ? (
            <Text style={styles.sectionTitle}>6. Action Points Summary</Text>
          ) : (
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Helvetica-Bold",
                color: "#6B7280",
                marginBottom: 8,
              }}
            >
              6. Action Points Summary (continued)
            </Text>
          )}

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={{ width: "6%" }}>#</Text>
              <Text style={{ width: "22%" }}>Title</Text>
              <Text style={{ width: "12%" }}>Module</Text>
              <Text style={{ width: "10%" }}>Severity</Text>
              <Text style={{ width: "30%" }}>BM Response</Text>
              <Text style={{ width: "20%" }}>Status</Text>
            </View>
            {pageAps.map((ap, idx) => {
              const sevColor = SEVERITY_COLORS[ap.severity] ?? "#64748b";
              const bmResponse = ap.bmResponseText
                ? ap.bmResponseText.length > 200
                  ? ap.bmResponseText.substring(0, 200) + "..."
                  : ap.bmResponseText
                : "Awaiting response";
              return (
                <View
                  key={`ap-row-${pageIdx}-${idx}`}
                  style={idx % 2 === 0 ? styles.tableRow : styles.tableRowAlt}
                >
                  <Text style={{ width: "6%" }}>{ap.serialNo}</Text>
                  <Text style={{ width: "22%", fontSize: 8 }}>{ap.title}</Text>
                  <Text style={{ width: "12%", fontSize: 8 }}>
                    {ap.moduleCode}
                  </Text>
                  <Text style={{ width: "10%", fontSize: 8, color: sevColor }}>
                    {ap.severity}
                  </Text>
                  <Text style={{ width: "30%", fontSize: 7 }}>
                    {bmResponse}
                  </Text>
                  <Text style={{ width: "20%", fontSize: 8 }}>
                    {ap.status.replace(/_/g, " ")}
                  </Text>
                </View>
              );
            })}
          </View>

          <Text style={styles.footer}>
            RBIA Audit Report | {engagement.tenant.name}
          </Text>
        </Page>
      ))}
    </>
  );
}

// ─── Section 7: Observations ────────────────────────────────────────────────

function ObservationsSection({ data }: { data: RbiaReportData }) {
  const { engagement, observations } = data;

  if (observations.length === 0) {
    return (
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>7. Observations</Text>
        <Text style={styles.bodyText}>
          No formal observations were raised during this engagement.
        </Text>
        <Text style={styles.footer}>
          RBIA Audit Report | {engagement.tenant.name}
        </Text>
      </Page>
    );
  }

  // Each observation gets ~half a page, so 2 per page
  const OBS_PER_PAGE = 2;
  const pages: Array<typeof observations> = [];
  for (let i = 0; i < observations.length; i += OBS_PER_PAGE) {
    pages.push(observations.slice(i, i + OBS_PER_PAGE));
  }

  return (
    <>
      {pages.map((pageObs, pageIdx) => (
        <Page key={`obs-${pageIdx}`} size="A4" style={styles.page}>
          {pageIdx === 0 ? (
            <Text style={styles.sectionTitle}>7. Observations</Text>
          ) : (
            <Text
              style={{
                fontSize: 11,
                fontFamily: "Helvetica-Bold",
                color: "#6B7280",
                marginBottom: 8,
              }}
            >
              7. Observations (continued)
            </Text>
          )}

          {pageObs.map((obs, idx) => {
            const sevColor = SEVERITY_COLORS[obs.severity] ?? "#64748b";
            return (
              <View
                key={`obs-block-${pageIdx}-${idx}`}
                style={styles.observationBlock}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text style={styles.observationTitle}>{obs.title}</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Text
                      style={{
                        fontSize: 8,
                        color: sevColor,
                        fontFamily: "Helvetica-Bold",
                      }}
                    >
                      {obs.severity}
                    </Text>
                    <Text
                      style={{
                        fontSize: 8,
                        color: "#6B7280",
                      }}
                    >
                      {obs.status.replace(/_/g, " ")}
                    </Text>
                  </View>
                </View>

                {/* 5C Fields */}
                <View style={styles.observationField}>
                  <Text style={styles.observationFieldLabel}>Condition:</Text>
                  <Text style={styles.observationFieldValue}>
                    {obs.condition}
                  </Text>
                </View>
                <View style={styles.observationField}>
                  <Text style={styles.observationFieldLabel}>Criteria:</Text>
                  <Text style={styles.observationFieldValue}>
                    {obs.criteria}
                  </Text>
                </View>
                <View style={styles.observationField}>
                  <Text style={styles.observationFieldLabel}>Cause:</Text>
                  <Text style={styles.observationFieldValue}>{obs.cause}</Text>
                </View>
                <View style={styles.observationField}>
                  <Text style={styles.observationFieldLabel}>Effect:</Text>
                  <Text style={styles.observationFieldValue}>{obs.effect}</Text>
                </View>
                <View style={styles.observationField}>
                  <Text style={styles.observationFieldLabel}>
                    Recommendation:
                  </Text>
                  <Text style={styles.observationFieldValue}>
                    {obs.recommendation}
                  </Text>
                </View>
              </View>
            );
          })}

          <Text style={styles.footer}>
            RBIA Audit Report | {engagement.tenant.name}
          </Text>
        </Page>
      ))}
    </>
  );
}

// ─── Section 8: Meeting Minutes ─────────────────────────────────────────────

function MeetingMinutesSection({ data }: { data: RbiaReportData }) {
  const { engagement, meetings } = data;

  const openingMeeting = meetings.find((m) => m.meetingType === "OPENING");
  const exitMeeting = meetings.find((m) => m.meetingType === "EXIT");

  return (
    <Page size="A4" style={styles.page}>
      <Text style={styles.sectionTitle}>8. Meeting Minutes</Text>

      {/* Opening Meeting */}
      <View style={styles.meetingBlock}>
        <Text style={styles.meetingType}>Opening Meeting</Text>
        {openingMeeting ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>
                {formatDate(openingMeeting.meetingDate)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Signed Off:</Text>
              <Text style={styles.value}>
                {openingMeeting.signedOff
                  ? `Yes${openingMeeting.signedOffByName ? ` (by ${openingMeeting.signedOffByName})` : ""}`
                  : "No"}
              </Text>
            </View>

            {/* Attendees */}
            <Text
              style={{
                fontSize: 10,
                fontFamily: "Helvetica-Bold",
                marginTop: 6,
                marginBottom: 4,
              }}
            >
              Attendees:
            </Text>
            {openingMeeting.attendees.length > 0 ? (
              openingMeeting.attendees.map((attendee, idx) => (
                <Text
                  key={`open-att-${idx}`}
                  style={{ fontSize: 9, marginLeft: 10, marginBottom: 2 }}
                >
                  {attendee.name} ({attendee.designation} - {attendee.role})
                </Text>
              ))
            ) : (
              <Text style={{ fontSize: 9, color: "#6B7280", marginLeft: 10 }}>
                No attendees recorded
              </Text>
            )}

            {/* Minutes */}
            {openingMeeting.minutesText && (
              <>
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Helvetica-Bold",
                    marginTop: 6,
                    marginBottom: 4,
                  }}
                >
                  Minutes:
                </Text>
                <Text style={{ fontSize: 9, lineHeight: 1.5 }}>
                  {openingMeeting.minutesText}
                </Text>
              </>
            )}

            {/* Key Discussion Points */}
            {openingMeeting.keyDiscussionPoints && (
              <>
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Helvetica-Bold",
                    marginTop: 6,
                    marginBottom: 4,
                  }}
                >
                  Key Discussion Points:
                </Text>
                <Text style={{ fontSize: 9, lineHeight: 1.5 }}>
                  {openingMeeting.keyDiscussionPoints}
                </Text>
              </>
            )}
          </>
        ) : (
          <Text style={{ fontSize: 10, color: "#6B7280" }}>Not recorded</Text>
        )}
      </View>

      {/* Exit Meeting */}
      <View style={styles.meetingBlock}>
        <Text style={styles.meetingType}>Exit Meeting</Text>
        {exitMeeting ? (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Date:</Text>
              <Text style={styles.value}>
                {formatDate(exitMeeting.meetingDate)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Signed Off:</Text>
              <Text style={styles.value}>
                {exitMeeting.signedOff
                  ? `Yes${exitMeeting.signedOffByName ? ` (by ${exitMeeting.signedOffByName})` : ""}`
                  : "No"}
              </Text>
            </View>

            {/* Attendees */}
            <Text
              style={{
                fontSize: 10,
                fontFamily: "Helvetica-Bold",
                marginTop: 6,
                marginBottom: 4,
              }}
            >
              Attendees:
            </Text>
            {exitMeeting.attendees.length > 0 ? (
              exitMeeting.attendees.map((attendee, idx) => (
                <Text
                  key={`exit-att-${idx}`}
                  style={{ fontSize: 9, marginLeft: 10, marginBottom: 2 }}
                >
                  {attendee.name} ({attendee.designation} - {attendee.role})
                </Text>
              ))
            ) : (
              <Text style={{ fontSize: 9, color: "#6B7280", marginLeft: 10 }}>
                No attendees recorded
              </Text>
            )}

            {/* Minutes */}
            {exitMeeting.minutesText && (
              <>
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Helvetica-Bold",
                    marginTop: 6,
                    marginBottom: 4,
                  }}
                >
                  Minutes:
                </Text>
                <Text style={{ fontSize: 9, lineHeight: 1.5 }}>
                  {exitMeeting.minutesText}
                </Text>
              </>
            )}

            {/* Key Discussion Points */}
            {exitMeeting.keyDiscussionPoints && (
              <>
                <Text
                  style={{
                    fontSize: 10,
                    fontFamily: "Helvetica-Bold",
                    marginTop: 6,
                    marginBottom: 4,
                  }}
                >
                  Key Discussion Points:
                </Text>
                <Text style={{ fontSize: 9, lineHeight: 1.5 }}>
                  {exitMeeting.keyDiscussionPoints}
                </Text>
              </>
            )}
          </>
        ) : (
          <Text style={{ fontSize: 10, color: "#6B7280" }}>Not recorded</Text>
        )}
      </View>

      <Text style={styles.footer}>
        RBIA Audit Report | {engagement.tenant.name} | Final Page
      </Text>
    </Page>
  );
}

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
      <DetailedScoresSection data={data} />
      <ActionPointsSummarySection data={data} />
      <ObservationsSection data={data} />
      <MeetingMinutesSection data={data} />
    </Document>
  );
}
