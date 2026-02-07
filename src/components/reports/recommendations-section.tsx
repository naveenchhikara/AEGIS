import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, ClipboardList } from "@/lib/icons";
import { SEVERITY_COLORS } from "@/lib/constants";
import { getRecommendations } from "@/lib/report-utils";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

const recommendations = getRecommendations();

const PRIORITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
};

export function RecommendationsSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5" />
          Recommendations
        </CardTitle>
        <CardDescription>
          Prioritized action items for board consideration -{" "}
          {recommendations.length} recommendation(s)
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ol className="space-y-0">
          {recommendations.map((rec, index) => (
            <li key={`${rec.priority}-${rec.title}`}>
              {index > 0 && <Separator className="my-4" />}

              <div className="space-y-2">
                {/* Priority badge and title */}
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 text-base font-bold text-muted-foreground tabular-nums">
                    {index + 1}.
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={
                          SEVERITY_COLORS[
                            rec.priority as keyof typeof SEVERITY_COLORS
                          ] || ""
                        }
                      >
                        {PRIORITY_LABEL[rec.priority] || rec.priority}
                      </Badge>
                      <span className="font-semibold text-base">
                        {rec.title}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-base text-muted-foreground">
                      {rec.description}
                    </p>

                    {/* Related findings */}
                    <div className="flex items-center gap-2 flex-wrap text-sm">
                      <span className="text-muted-foreground">
                        Related findings:
                      </span>
                      {rec.relatedFindingIds.map((id) => (
                        <Link
                          key={id}
                          href={`/findings/${id}`}
                          className="font-mono text-sm text-primary hover:underline"
                        >
                          {id}
                        </Link>
                      ))}
                    </div>

                    {/* Target date */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      Target: {formatDate(rec.targetDate)}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
