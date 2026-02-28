"use client";

import {
  getRatingBand,
  toPercentage,
  type RatingBand,
} from "@/lib/rbia-scoring-engine";
import type { EngagementModuleScoreRow } from "@/data-access/rbia-scoring";
import type { BranchRbiaScoreData } from "@/data-access/rbia-scoring";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, BarChart3 } from "@/lib/icons";

// ─── Rating band display config ──────────────────────────────────────────────

type RatingBandConfig = {
  label: string;
  className: string;
};

const RATING_BAND_DISPLAY: Record<RatingBand, RatingBandConfig> = {
  VERY_GOOD: {
    label: "Very Good",
    className: "bg-green-700 text-white border-transparent",
  },
  GOOD: {
    label: "Good",
    className: "bg-green-500 text-white border-transparent",
  },
  SATISFACTORY: {
    label: "Satisfactory",
    className: "bg-yellow-500 text-black border-transparent",
  },
  MODERATE: {
    label: "Moderate",
    className: "bg-orange-500 text-white border-transparent",
  },
  POOR: {
    label: "Poor",
    className: "bg-red-600 text-white border-transparent",
  },
};

// Engagement statuses where freeze button is visible
const FREEZE_VISIBLE_STATUSES = new Set(["REPORT_DRAFT", "COMPLETED"]);

// ─── Props ───────────────────────────────────────────────────────────────────

export type RbiaScorePanelProps = {
  moduleScores: EngagementModuleScoreRow[];
  branchScore: BranchRbiaScoreData | null;
  engagementStatus: string;
  engagementId: string;
  canFreeze: boolean;
};

// ─── Helper: compute live composite from module progress rows ────────────────

/**
 * Approximates composite score from EngagementModuleScoreRow progress data.
 * Since the DAL returns counts (not raw weighted scores), we estimate the
 * per-module completion percentage and average across modules.
 *
 * NOTE: If a frozen BranchRbiaScore exists, callers should use its
 * compositeScore instead, as it reflects the full weighted roll-up.
 */
function computeLiveCompositeFromProgress(
  modules: EngagementModuleScoreRow[],
): { compositeScore: number | null; totalScored: number; totalItems: number } {
  let totalScored = 0;
  let totalItems = 0;

  for (const mod of modules) {
    totalScored += mod.scoredCount;
    totalItems += mod.totalLeafCount;
  }

  if (totalItems === 0) {
    return { compositeScore: null, totalScored, totalItems };
  }

  // Use scored percentage as a proxy for composite score
  // (True composite requires full tree scoring; this is a progress indicator)
  const compositeScore = totalScored / totalItems;
  return { compositeScore, totalScored, totalItems };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RbiaScorePanel({
  moduleScores,
  branchScore,
  engagementStatus,
  engagementId,
  canFreeze,
}: RbiaScorePanelProps) {
  // Determine composite score source
  const isFrozen = branchScore !== null && branchScore.frozenAt !== null;
  const liveProgress = computeLiveCompositeFromProgress(moduleScores);

  // Frozen score takes precedence
  const compositeScore = isFrozen
    ? branchScore.compositeScore
    : liveProgress.compositeScore;

  const totalScored = liveProgress.totalScored;
  const totalItems = liveProgress.totalItems;
  const progressPercent =
    totalItems > 0 ? Math.round((totalScored / totalItems) * 100) : 0;

  // Rating band
  const ratingBand: RatingBand | null =
    compositeScore !== null ? getRatingBand(compositeScore) : null;
  const bandConfig = ratingBand ? RATING_BAND_DISPLAY[ratingBand] : null;

  // Composite percentage for display
  const compositePercent =
    compositeScore !== null ? toPercentage(compositeScore) : null;

  // Freeze button visibility
  const showFreezeButton = FREEZE_VISIBLE_STATUSES.has(engagementStatus);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            RBIA Examination Score
          </CardTitle>
          {showFreezeButton && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled
                      className="gap-1.5"
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Freeze Score
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Available after all modules are complete</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Composite Score Display */}
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold tabular-nums">
            {compositePercent !== null ? `${compositePercent}%` : "--"}
          </span>
          {bandConfig && (
            <Badge className={bandConfig.className}>{bandConfig.label}</Badge>
          )}
          {isFrozen && (
            <Badge variant="outline" className="gap-1 text-xs">
              <Lock className="h-3 w-3" />
              Frozen
            </Badge>
          )}
        </div>

        {/* Total Progress */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-sm">
            Total: {totalScored} / {totalItems} items scored
            {totalItems > 0 && ` \u2014 ${progressPercent}%`}
          </p>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Module Breakdown */}
        {moduleScores.length > 0 && (
          <div className="space-y-2 pt-1">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Module Breakdown
            </p>
            <div className="space-y-1.5">
              {moduleScores.map((mod) => {
                const modPercent =
                  mod.totalLeafCount > 0
                    ? Math.round((mod.scoredCount / mod.totalLeafCount) * 100)
                    : 0;

                // Use frozen per-module score if available
                const frozenModuleScore =
                  isFrozen && branchScore.moduleScores[mod.moduleCode] != null
                    ? branchScore.moduleScores[mod.moduleCode]
                    : null;

                const displayPercent =
                  frozenModuleScore !== null
                    ? toPercentage(frozenModuleScore)
                    : modPercent;

                const modBand =
                  frozenModuleScore !== null
                    ? getRatingBand(frozenModuleScore)
                    : mod.scoredCount > 0 && mod.totalLeafCount > 0
                      ? getRatingBand(mod.scoredCount / mod.totalLeafCount)
                      : null;

                const modBandConfig = modBand
                  ? RATING_BAND_DISPLAY[modBand]
                  : null;

                return (
                  <div
                    key={mod.nodeId}
                    className="flex items-center gap-2 text-sm"
                  >
                    <span className="text-muted-foreground w-32 shrink-0 truncate text-xs">
                      {mod.moduleName}
                    </span>
                    <div className="flex-1">
                      <Progress value={displayPercent} className="h-1.5" />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums">
                      {displayPercent}%
                    </span>
                    {modBandConfig && (
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${modBandConfig.className.split(" ")[0]}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {moduleScores.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">
            No examination modules configured for this engagement.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
