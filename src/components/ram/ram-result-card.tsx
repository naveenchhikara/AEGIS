import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge } from "@/lib/icons";

interface RamResultCardProps {
  compositeScore: number;
  riskCategory: string;
  auditFrequency: number;
  status: string;
}

const RISK_COLORS: Record<string, string> = {
  HIGH: "bg-red-100 text-red-800 border-red-300",
  MEDIUM: "bg-amber-100 text-amber-800 border-amber-300",
  LOW: "bg-green-100 text-green-800 border-green-300",
};

const STATUS_COLORS: Record<string, string> = {
  COMPUTED: "bg-blue-100 text-blue-800 border-blue-300",
  APPROVED: "bg-green-100 text-green-800 border-green-300",
};

export function RamResultCard({
  compositeScore,
  riskCategory,
  auditFrequency,
  status,
}: RamResultCardProps) {
  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            RAM Computation Result
          </CardTitle>
          <Badge variant="outline" className={STATUS_COLORS[status] ?? ""}>
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Composite Score */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Composite Score</p>
            <p className="text-3xl font-bold">{compositeScore.toFixed(2)}</p>
          </div>

          {/* Risk Category */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Risk Category</p>
            <Badge variant="outline" className={`text-lg ${RISK_COLORS[riskCategory] ?? ""}`}>
              {riskCategory}
            </Badge>
          </div>

          {/* Audit Frequency */}
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Derived Audit Frequency
            </p>
            <p className="text-2xl font-semibold">
              Every {auditFrequency} months
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
