"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "@/lib/icons";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PcaStatusBadgeProps {
  status: string | null;
}

// ─── PCA Config ─────────────────────────────────────────────────────────────

const PCA_CONFIG: Record<
  string,
  { label: string; color: string; description: string }
> = {
  NONE: {
    label: "No PCA",
    color:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    description: "Bank is not under Prompt Corrective Action.",
  },
  PCA1: {
    label: "PCA Level 1",
    color:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    description:
      "Breach of Risk Threshold 1 — restrictions on dividend distribution and remittance of profits.",
  },
  PCA2: {
    label: "PCA Level 2",
    color:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    description:
      "Breach of Risk Threshold 2 — additional restrictions on branch expansion and management compensation.",
  },
  PCA3: {
    label: "PCA Level 3",
    color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    description:
      "Breach of Risk Threshold 3 — severe restrictions including possible merger or amalgamation.",
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function PcaStatusBadge({ status }: PcaStatusBadgeProps) {
  const config = status ? PCA_CONFIG[status] : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ShieldAlert className="h-4 w-4" />
          PCA Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        {config ? (
          <div className="space-y-2">
            <Badge
              variant="outline"
              className={`text-sm font-semibold ${config.color}`}
            >
              {config.label}
            </Badge>
            <p className="text-muted-foreground text-xs">
              {config.description}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <Badge
              variant="outline"
              className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            >
              Not Configured
            </Badge>
            <p className="text-muted-foreground text-xs">
              PCA status has not been configured for this bank.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
