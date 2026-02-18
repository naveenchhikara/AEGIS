"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Activity } from "@/lib/icons";

interface KriData {
  id: string;
  name: string;
  description?: string | null;
  currentValue: number | null;
  thresholdLow: number | null;
  thresholdHigh: number | null;
  breachStatus: string;
  frequency: string;
  lastUpdated: Date | null;
  riskRegister: {
    id: string;
    riskStatement: string;
    entity: {
      name: string;
      entityType: string;
    };
  };
}

interface KriDashboardProps {
  data: KriData[];
}

const BREACH_STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  BREACH: { bg: "bg-red-50/50", text: "text-red-800", border: "border-red-300" },
  WARNING: { bg: "bg-amber-50/50", text: "text-amber-800", border: "border-amber-300" },
  NORMAL: { bg: "", text: "text-green-800", border: "border-green-300" },
};

const BREACH_STATUS_BADGE_COLORS: Record<string, string> = {
  BREACH: "bg-red-100 text-red-800 border-red-300",
  WARNING: "bg-amber-100 text-amber-800 border-amber-300",
  NORMAL: "bg-green-100 text-green-800 border-green-300",
};

export function KriDashboard({ data }: KriDashboardProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <Activity className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No KRI breaches or warnings detected.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All key risk indicators are within normal thresholds.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Breached & Warning KRIs</h3>
          <p className="text-sm text-muted-foreground">
            {data.length} indicator{data.length !== 1 ? "s" : ""} requiring attention
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data.map((kri) => {
          const colors = BREACH_STATUS_COLORS[kri.breachStatus] || BREACH_STATUS_COLORS.NORMAL;
          const badgeColor = BREACH_STATUS_BADGE_COLORS[kri.breachStatus] || BREACH_STATUS_BADGE_COLORS.NORMAL;

          // Determine if value is above or below threshold
          const isAboveThreshold =
            kri.currentValue !== null &&
            kri.thresholdHigh !== null &&
            kri.currentValue > Number(kri.thresholdHigh);

          const isBelowThreshold =
            kri.currentValue !== null &&
            kri.thresholdLow !== null &&
            kri.currentValue < Number(kri.thresholdLow);

          return (
            <Card key={kri.id} className={`${colors.bg} ${colors.border}`}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1 flex-1">
                  <CardTitle className="text-sm font-medium">{kri.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {kri.riskRegister.entity.name}
                  </p>
                </div>
                {kri.breachStatus !== "NORMAL" && (
                  <AlertTriangle
                    className={`h-4 w-4 flex-shrink-0 ${
                      kri.breachStatus === "BREACH" ? "text-red-600" : "text-amber-600"
                    }`}
                  />
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold">
                      {kri.currentValue !== null
                        ? Number(kri.currentValue).toFixed(2)
                        : "N/A"}
                    </div>
                    {kri.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {kri.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      {kri.thresholdLow !== null && (
                        <div className="text-muted-foreground">
                          Low: {Number(kri.thresholdLow).toFixed(2)}
                        </div>
                      )}
                      {kri.thresholdHigh !== null && (
                        <div className="text-muted-foreground">
                          High: {Number(kri.thresholdHigh).toFixed(2)}
                        </div>
                      )}
                    </div>

                    {(isAboveThreshold || isBelowThreshold) && (
                      <div className="flex items-center">
                        <TrendingUp
                          className={`h-4 w-4 ${
                            isAboveThreshold ? "text-red-500 rotate-0" : "text-red-500 rotate-180"
                          }`}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={badgeColor}>
                      {kri.breachStatus}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {kri.frequency}
                    </span>
                  </div>

                  {kri.lastUpdated && (
                    <div className="text-xs text-muted-foreground pt-1 border-t">
                      Updated: {new Date(kri.lastUpdated).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
