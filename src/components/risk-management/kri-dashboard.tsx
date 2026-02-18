"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, TrendingDown } from "@/lib/icons";

interface KriData {
  id: string;
  name: string;
  value: number;
  threshold: number;
  trend: "up" | "down" | "stable";
  breached: boolean;
}

interface KriDashboardProps {
  data: KriData[];
}

export function KriDashboard({ data }: KriDashboardProps) {
  // Mock data if none provided
  const kriIndicators = data.length > 0 ? data : [
    { id: "1", name: "NPL Ratio", value: 3.2, threshold: 3.0, trend: "up" as const, breached: true },
    { id: "2", name: "CAR", value: 14.5, threshold: 12.0, trend: "stable" as const, breached: false },
    { id: "3", name: "Fraud Incidents", value: 2, threshold: 5, trend: "down" as const, breached: false },
    { id: "4", name: "IT Downtime (hrs)", value: 8, threshold: 4, trend: "up" as const, breached: true },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kriIndicators.map((kri) => (
        <Card key={kri.id} className={kri.breached ? "border-red-300 bg-red-50/50" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kri.name}</CardTitle>
            {kri.breached && (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kri.value}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">
                Threshold: {kri.threshold}
              </p>
              <div className="flex items-center">
                {kri.trend === "up" && <TrendingUp className="h-4 w-4 text-red-500" />}
                {kri.trend === "down" && <TrendingDown className="h-4 w-4 text-green-500" />}
              </div>
            </div>
            {kri.breached && (
              <Badge variant="outline" className="mt-2 bg-red-100 text-red-800 border-red-300">
                Breach
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
