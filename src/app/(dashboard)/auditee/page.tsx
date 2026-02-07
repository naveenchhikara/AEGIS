import { findings } from "@/data";
import type { FindingsData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserCheck, FileText, Clock, AlertTriangle } from "@/lib/icons";

const data = findings as unknown as FindingsData;

const pendingResponse = data.findings.filter(
  (f) => f.status === "submitted" || f.status === "draft",
).length;

const awaitingReview = data.findings.filter(
  (f) => f.status === "responded",
).length;

export default function AuditeePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Auditee Portal
        </h1>
        <p className="text-sm text-muted-foreground">
          Respond to audit findings and track remediation
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-lg bg-amber-50 p-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingResponse}</p>
              <p className="text-xs text-muted-foreground">
                Pending Your Response
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-lg bg-blue-50 p-2.5">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{awaitingReview}</p>
              <p className="text-xs text-muted-foreground">Awaiting Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="rounded-lg bg-emerald-50 p-2.5">
              <FileText className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.summary.total}</p>
              <p className="text-xs text-muted-foreground">Total Findings</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Findings pending response */}
      {pendingResponse > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Findings Pending Your Response
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.findings
                .filter(
                  (f) => f.status === "submitted" || f.status === "draft",
                )
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                        {f.observation}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due:{" "}
                        {new Date(f.targetDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                        f.severity === "critical"
                          ? "bg-red-100 text-red-700"
                          : f.severity === "high"
                            ? "bg-orange-100 text-orange-700"
                            : f.severity === "medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                      }`}
                    >
                      {f.severity}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portal description */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="font-medium">Auditee Response Portal</p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                In the full release, auditees will be able to respond to
                findings, upload evidence documents, track remediation progress,
                and communicate with auditors directly through this portal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
