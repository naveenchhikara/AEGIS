"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, Calendar, CheckCircle } from "@/lib/icons";
import { toast } from "sonner";
import { buildAcbAgenda } from "@/actions/governance/build-acb-agenda";

export function AcbAgendaBuilder() {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generatedMeeting, setGeneratedMeeting] = React.useState<any>(null);
  const [selectedYear, setSelectedYear] = React.useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = React.useState<string>("Q1_APR_JUN");

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  async function handleGenerate() {
    setIsGenerating(true);
    setGeneratedMeeting(null);

    const result = await buildAcbAgenda({
      year: selectedYear,
      quarter: selectedQuarter as any,
    });

    if (result.success) {
      toast.success("Quarterly pack generated successfully");
      setGeneratedMeeting(result.data);
      router.refresh();
    } else {
      toast.error(result.error);
    }

    setIsGenerating(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">ACB Agenda Builder</h2>
        <p className="text-muted-foreground">
          Auto-generate quarterly ACB packs from live data
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Quarterly Pack</CardTitle>
          <CardDescription>
            Select year and quarter to auto-generate ACB meeting pack with 5 standard agenda items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Financial Year</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      FY {year}-{(year + 1).toString().slice(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quarter">Quarter</Label>
              <Select value={selectedQuarter} onValueChange={setSelectedQuarter}>
                <SelectTrigger id="quarter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Q1_APR_JUN">Q1 (Apr - Jun)</SelectItem>
                  <SelectItem value="Q2_JUL_SEP">Q2 (Jul - Sep)</SelectItem>
                  <SelectItem value="Q3_OCT_DEC">Q3 (Oct - Dec)</SelectItem>
                  <SelectItem value="Q4_JAN_MAR">Q4 (Jan - Mar)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <FileText className="mr-2 h-4 w-4" />
            Generate Quarterly Pack
          </Button>

          {generatedMeeting && (
            <div className="mt-6 p-4 border rounded-lg bg-green-50 dark:bg-green-950 space-y-4">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <CheckCircle className="h-5 w-5" />
                <h3 className="font-semibold">Pack Generated Successfully</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Meeting ID</p>
                  <p className="font-mono text-xs">{generatedMeeting.meetingId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Committee</p>
                  <p className="font-medium">ACB</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Agenda Items Generated:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="mt-0.5">1</Badge>
                    <span>
                      High & Critical Observations Review
                      <span className="text-muted-foreground ml-2">
                        ({generatedMeeting.criticalObservationsCount} items)
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="mt-0.5">2</Badge>
                    <span>Compliance Status Dashboard</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="mt-0.5">3</Badge>
                    <span>
                      Overdue Observations
                      <span className="text-muted-foreground ml-2">
                        ({generatedMeeting.overdueCount} items)
                      </span>
                    </span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="mt-0.5">4</Badge>
                    <span>Housekeeping Risk Review</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Badge variant="outline" className="mt-0.5">5</Badge>
                    <span>Quarterly Audit Completion Report</span>
                  </li>
                </ul>
              </div>

              <Button variant="outline" asChild className="w-full">
                <a href={`/governance/meetings/${generatedMeeting.meetingId}`}>
                  View Meeting Details
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What Gets Included?</CardTitle>
          <CardDescription>
            The quarterly pack auto-aggregates data from across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">High & Critical Observations</p>
                <p className="text-sm text-muted-foreground">
                  All open observations with HIGH or CRITICAL severity
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Compliance Status Summary</p>
                <p className="text-sm text-muted-foreground">
                  Breakdown by status (Open, Closed, Pending, etc.)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Overdue Items Analysis</p>
                <p className="text-sm text-muted-foreground">
                  All compliance items past their due date
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Housekeeping Risk Metrics</p>
                <p className="text-sm text-muted-foreground">
                  Accounts with aging &gt; 90 days across all branches
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm">Audit Completion Stats</p>
                <p className="text-sm text-muted-foreground">
                  Number of audits completed during the quarter
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
