"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Download, FileBarChart } from "@/lib/icons";

// ─── Types ─────────────────────────────────────────────────────────────────

interface BoardReportRecord {
  id: string;
  title: string;
  quarter: string;
  year: number;
  generatedAt: string;
  generatedBy: { name: string } | null;
  fileSize: number | null;
}

interface ReportGeneratorProps {
  canGenerate: boolean;
  previousReports: BoardReportRecord[];
}

// ─── Indian Fiscal Year Helpers ────────────────────────────────────────────

/**
 * Get current Indian fiscal year. FY runs Apr–Mar.
 * If today is Jan 2026, the current FY is 2025 (FY 2025-26).
 */
function getCurrentFY(): number {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  return month < 3 ? now.getFullYear() - 1 : now.getFullYear();
}

const QUARTERS = [
  { value: "Q1", label: "Q1 (Apr–Jun)" },
  { value: "Q2", label: "Q2 (Jul–Sep)" },
  { value: "Q3", label: "Q3 (Oct–Dec)" },
  { value: "Q4", label: "Q4 (Jan–Mar)" },
] as const;

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatQuarterLabel(quarter: string, year: number): string {
  const q = quarter.replace(/_/g, " ");
  return `${q} FY ${year}-${String(year + 1).slice(2)}`;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function ReportGenerator({
  canGenerate,
  previousReports,
}: ReportGeneratorProps) {
  const currentFY = getCurrentFY();

  const [quarter, setQuarter] = useState("Q3");
  const [year, setYear] = useState(String(currentFY));
  const [commentary, setCommentary] = useState("");
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  async function handleGenerate() {
    if (!quarter || !year) {
      toast.error("Please select quarter and year");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/reports/board-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          year: parseInt(year),
          quarter,
          executiveCommentary: commentary || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate report");
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        response.headers
          .get("content-disposition")
          ?.match(/filename="(.+)"/)?.[1] ??
        `board-report-${quarter}-FY${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Board report generated and downloaded");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to generate report";
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDownload(reportId: string) {
    setDownloading(reportId);
    try {
      const response = await fetch(`/api/reports/board-report?id=${reportId}`);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get download link");
      }

      const data = await response.json();
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to download report";
      toast.error(message);
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Generate Report Section — Only for CAE */}
      {canGenerate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              Generate Board Report
            </CardTitle>
            <CardDescription>
              Generate a PDF board report for the audit committee. Select the
              reporting period and optionally add executive commentary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Quarter</label>
                <Select value={quarter} onValueChange={setQuarter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {QUARTERS.map((q) => (
                      <SelectItem key={q.value} value={q.value}>
                        {q.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fiscal Year</label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={String(currentFY)}>
                      FY {currentFY}-{String(currentFY + 1).slice(2)}
                    </SelectItem>
                    <SelectItem value={String(currentFY - 1)}>
                      FY {currentFY - 1}-{String(currentFY).slice(2)}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Executive Commentary{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <Textarea
                placeholder="Add CAE commentary for the executive summary section..."
                value={commentary}
                onChange={(e) => setCommentary(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-muted-foreground text-xs">
                This commentary will appear in the Executive Summary section of
                the board report.
              </p>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full sm:w-auto"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Report...
                </>
              ) : (
                <>
                  <FileBarChart className="mr-2 h-4 w-4" />
                  Generate Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Previously Generated Reports */}
      {previousReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Previously Generated Reports</CardTitle>
            <CardDescription>
              Download previously generated board reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Generated By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previousReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {formatQuarterLabel(report.quarter, report.year)}
                    </TableCell>
                    <TableCell>
                      {report.generatedBy?.name ?? "Unknown"}
                    </TableCell>
                    <TableCell>
                      {new Date(report.generatedAt).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </TableCell>
                    <TableCell>{formatFileSize(report.fileSize)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(report.id)}
                        disabled={downloading === report.id}
                      >
                        {downloading === report.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
