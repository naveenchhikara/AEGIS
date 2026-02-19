import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppInventoryTable } from "@/components/is-audit/app-inventory-table";
import { ChecklistForm } from "@/components/is-audit/checklist-form";
import { VendorRiskPanel } from "@/components/is-audit/vendor-risk-panel";
import { CbsParameterAudit } from "@/components/is-audit/cbs-parameter-audit";
import { CyberSecurityChecklist } from "@/components/is-audit/cyber-security-checklist";
import { TechControlEvidence } from "@/components/is-audit/tech-control-evidence";
import {
  getApplicationInventory,
  getApplicationsPendingDrTest,
  getIsAuditChecklists,
  getVendorRiskAssessments,
} from "@/data-access/investment";

export default async function IsAuditPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  // IS Auditor can access, or admin:system
  const canAccess =
    userRoles.includes("IS_AUDITOR") ||
    hasPermission(userRoles, "admin:system");

  if (!canAccess) {
    redirect("/dashboard");
  }

  // Fetch real data from DAL
  const applications = await getApplicationInventory(session);
  const pendingDr = await getApplicationsPendingDrTest(session);
  const checklists = await getIsAuditChecklists(session);
  const vendorAssessments = await getVendorRiskAssessments(session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">IS/EDP Audit</h1>
        <p className="text-muted-foreground">
          Information Systems audit, application inventory, and security
          checklists
        </p>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto">
          <TabsTrigger value="inventory">
            App Inventory ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="checklist">Audit Checklists</TabsTrigger>
          <TabsTrigger value="vendor">Vendor Risk</TabsTrigger>
          <TabsTrigger value="cbs">CBS Parameters</TabsTrigger>
          <TabsTrigger value="cyber">Cyber Security</TabsTrigger>
          <TabsTrigger value="evidence">Evidence & Gaps</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <AppInventoryTable
            applications={applications as any}
            pendingDr={pendingDr as any}
          />
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <ChecklistForm checklists={checklists as any} userId={session.user.id} />
        </TabsContent>

        <TabsContent value="vendor" className="space-y-4">
          <VendorRiskPanel
            assessments={vendorAssessments as any}
            applications={applications as any}
          />
        </TabsContent>

        <TabsContent value="cbs" className="space-y-4">
          <CbsParameterAudit userId={session.user.id} />
        </TabsContent>

        <TabsContent value="cyber" className="space-y-4">
          <CyberSecurityChecklist userId={session.user.id} />
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <TechControlEvidence checklists={checklists as any} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
