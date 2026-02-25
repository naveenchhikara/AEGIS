"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Pencil } from "@/lib/icons";
import type { EngagementModuleScoreRow } from "@/data-access/rbia-scoring";

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Matches the return shape of `getModuleSelections()` from rbia-examination DAL.
 * Prisma include on moduleNode gives { id, code, name }.
 */
export type ModuleSelectionRow = {
  id: string;
  moduleNodeId: string;
  isAutoSelected: boolean;
  selectionReason: string | null;
  moduleNode: {
    id: string;
    code: string;
    name: string;
  };
};

type ModuleStatus = "not-started" | "in-progress" | "complete";

function deriveStatus(
  scoredCount: number,
  totalLeafCount: number,
): ModuleStatus {
  if (totalLeafCount === 0 || scoredCount === 0) return "not-started";
  if (scoredCount >= totalLeafCount) return "complete";
  return "in-progress";
}

const STATUS_CONFIG: Record<
  ModuleStatus,
  { label: string; className: string }
> = {
  "not-started": {
    label: "Not started",
    className: "border-muted-foreground/30 bg-muted text-muted-foreground",
  },
  "in-progress": {
    label: "In progress",
    className:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  },
  complete: {
    label: "Complete",
    className:
      "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  },
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface RbiaModuleGridProps {
  modules: EngagementModuleScoreRow[];
  engagementId: string;
  moduleSelections: ModuleSelectionRow[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RbiaModuleGrid({
  modules,
  engagementId,
  moduleSelections,
}: RbiaModuleGridProps) {
  // Build a lookup: moduleNodeId -> isAutoSelected
  const selectionMap = new Map<string, boolean>();
  for (const sel of moduleSelections) {
    selectionMap.set(sel.moduleNodeId, sel.isAutoSelected);
  }

  if (modules.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground text-sm">
          No examination modules configured for this engagement.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {modules.map((mod) => {
        const status = deriveStatus(mod.scoredCount, mod.totalLeafCount);
        const config = STATUS_CONFIG[status];
        const progressPercent =
          mod.totalLeafCount > 0
            ? Math.round((mod.scoredCount / mod.totalLeafCount) * 100)
            : 0;
        const isAuto = selectionMap.get(mod.nodeId);

        return (
          <Link
            key={mod.nodeId}
            href={`/audit-execution/${engagementId}/rbia/module/${mod.moduleCode}`}
            className="group"
          >
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">
                    {mod.moduleName}
                  </CardTitle>
                  <Badge variant="outline" className={config.className}>
                    {config.label}
                  </Badge>
                </div>
                {/* Auto/Manual selection indicator */}
                {isAuto !== undefined && (
                  <div className="flex items-center gap-1 pt-1">
                    {isAuto ? (
                      <Badge
                        variant="secondary"
                        className="gap-1 px-1.5 py-0 text-[10px]"
                      >
                        <Zap className="h-2.5 w-2.5" />
                        Auto
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1 px-1.5 py-0 text-[10px]"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                        Manual
                      </Badge>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Progress bar */}
                <div className="space-y-1.5">
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-muted-foreground text-xs">
                    {mod.scoredCount} / {mod.totalLeafCount} items scored
                    {mod.totalLeafCount > 0 && (
                      <span className="ml-1">&mdash; {progressPercent}%</span>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
