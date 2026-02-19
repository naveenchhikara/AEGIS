"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type ControlEffectivenessData = {
  controlCode: string;
  controlName: string;
  processArea: string;
  totalTests: number;
  effectiveCount: number;
  partialCount: number;
  ineffectiveCount: number;
  score: number;
};

interface ControlEffectivenessDashboardProps {
  data: ControlEffectivenessData[];
}

function getRatingBadge(score: number) {
  if (score >= 80)
    return (
      <Badge className="bg-green-100 text-green-800">Highly Effective</Badge>
    );
  if (score >= 60)
    return <Badge className="bg-blue-100 text-blue-800">Effective</Badge>;
  if (score >= 40)
    return <Badge className="bg-amber-100 text-amber-800">Partial</Badge>;
  return <Badge variant="destructive">Ineffective</Badge>;
}

/**
 * Control Effectiveness Analytics Dashboard (R58).
 * Shows control test results, scores, and effectiveness trends.
 */
export function ControlEffectivenessDashboard({
  data,
}: ControlEffectivenessDashboardProps) {
  const avgScore =
    data.length > 0
      ? data.reduce((sum, d) => sum + d.score, 0) / data.length
      : 0;

  const highlyEffective = data.filter((d) => d.score >= 80).length;
  const effective = data.filter((d) => d.score >= 60 && d.score < 80).length;
  const partial = data.filter((d) => d.score >= 40 && d.score < 60).length;
  const ineffective = data.filter((d) => d.score < 40).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{avgScore.toFixed(0)}%</div>
            <p className="text-muted-foreground text-xs">Avg Effectiveness</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">
              {highlyEffective}
            </div>
            <p className="text-muted-foreground text-xs">Highly Effective</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{effective}</div>
            <p className="text-muted-foreground text-xs">Effective</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{partial}</div>
            <p className="text-muted-foreground text-xs">Partial</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{ineffective}</div>
            <p className="text-muted-foreground text-xs">Ineffective</p>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap-style table */}
      <Card>
        <CardHeader>
          <CardTitle>Control Test Results</CardTitle>
          <CardDescription>
            Effectiveness scores from work program test outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.length === 0 ? (
            <div className="text-muted-foreground rounded-md border border-dashed p-8 text-center text-sm">
              No control test results yet. Run work programs to populate.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Control</TableHead>
                    <TableHead>Process Area</TableHead>
                    <TableHead className="text-center">Tests</TableHead>
                    <TableHead className="text-center text-green-700">
                      ✓
                    </TableHead>
                    <TableHead className="text-center text-amber-700">
                      ~
                    </TableHead>
                    <TableHead className="text-center text-red-700">
                      ✗
                    </TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data
                    .sort((a, b) => a.score - b.score) // Worst first
                    .map((control) => (
                      <TableRow key={control.controlCode}>
                        <TableCell>
                          <span className="text-muted-foreground font-mono text-xs">
                            {control.controlCode}
                          </span>{" "}
                          <span className="font-medium">
                            {control.controlName}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">
                          {control.processArea}
                        </TableCell>
                        <TableCell className="text-center">
                          {control.totalTests}
                        </TableCell>
                        <TableCell className="text-center text-green-700">
                          {control.effectiveCount}
                        </TableCell>
                        <TableCell className="text-center text-amber-700">
                          {control.partialCount}
                        </TableCell>
                        <TableCell className="text-center text-red-700">
                          {control.ineffectiveCount}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {control.score.toFixed(0)}%
                        </TableCell>
                        <TableCell>{getRatingBadge(control.score)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
