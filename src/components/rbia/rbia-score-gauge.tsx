"use client";

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RbiaScoreGaugeProps {
  compositeScore: number; // 0.0 - 1.0
  ratingBand: string; // "VERY_GOOD" | "GOOD" | "SATISFACTORY" | "MODERATE" | "POOR"
}

// ─── Rating Band Colors (per CONTEXT.md locked decision) ────────────────────

const RBIA_RATING_COLORS: Record<string, string> = {
  VERY_GOOD: "hsl(142 60% 35%)", // dark green
  GOOD: "hsl(213 90% 55%)", // blue
  SATISFACTORY: "hsl(45 96% 56%)", // yellow
  MODERATE: "hsl(25 95% 53%)", // orange
  POOR: "hsl(0 84% 60%)", // red
};

const RATING_BAND_LABELS: Record<string, string> = {
  VERY_GOOD: "Very Good",
  GOOD: "Good",
  SATISFACTORY: "Satisfactory",
  MODERATE: "Moderate",
  POOR: "Poor",
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Circular donut gauge for the composite RBIA score.
 *
 * Uses RadialBarChart (recharts) via ChartContainer with:
 * - Clockwise fill from top (startAngle=90, endAngle=-270)
 * - Donut effect (innerRadius=70%, outerRadius=100%)
 * - Center overlay with percentage + rating band label
 * - Color coded by rating band per RBIA Policy 2020
 *
 * Per CLAUDE.md: center overlay uses pointer-events-none
 * to prevent blocking chart tooltips.
 */
export function RbiaScoreGauge({
  compositeScore,
  ratingBand,
}: RbiaScoreGaugeProps) {
  const percentage = Math.round(compositeScore * 100);
  const color = RBIA_RATING_COLORS[ratingBand] ?? RBIA_RATING_COLORS.POOR;
  const bandLabel =
    RATING_BAND_LABELS[ratingBand] ?? ratingBand.replace(/_/g, " ");

  const chartConfig = {
    score: { label: "RBIA Score", color },
  } satisfies ChartConfig;

  const chartData = [
    { name: "score", value: percentage, fill: "var(--color-score)" },
  ];

  return (
    <div className={cn("relative mx-auto min-h-[200px] w-full max-w-[200px]")}>
      <ChartContainer
        config={chartConfig}
        className="mx-auto min-h-[200px] w-full"
        aria-label={`RBIA composite score: ${percentage}% - ${bandLabel}`}
      >
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
          data={chartData}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="value" cornerRadius={10} background />
        </RadialBarChart>
      </ChartContainer>

      {/* Center overlay — pointer-events-none to avoid blocking tooltips */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold">{percentage}%</span>
        <span className="text-sm font-medium" style={{ color }}>
          {bandLabel}
        </span>
      </div>
    </div>
  );
}
