import { getRequiredSession } from "@/data-access/session";
import { getReportTemplates } from "@/data-access/analytics";
import { ReportGenerator } from "@/components/reports/report-generator";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, FileSpreadsheet, Download } from "@/lib/icons";

export default async function ReportsPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  const tenantId = (session.user as any).tenantId as string;

  const canRead = hasPermission(userRoles, "report:read");
  const canGenerate = hasPermission(userRoles, "report:generate");

  if (!canRead) {
    redirect("/dashboard");
  }

  const templates = await getReportTemplates(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Generate audit reports, compliance summaries, and board reports
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2 bg-blue-50">
              <FileSpreadsheet className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold">XLSX Reports</p>
              <p className="text-sm text-muted-foreground">
                Detailed audit data export
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2 bg-red-50">
              <FileText className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-semibold">PDF Summaries</p>
              <p className="text-sm text-muted-foreground">
                Executive summary reports
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="rounded-lg p-2 bg-green-50">
              <Download className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-semibold">Templates</p>
              <p className="text-sm text-muted-foreground">
                {templates.length} available
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report generation UI */}
      <ReportGenerator canGenerate={canGenerate} templates={templates} />
    </div>
  );
}
