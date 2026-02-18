import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppInventoryTable } from "@/components/is-audit/app-inventory-table";
import { ChecklistForm } from "@/components/is-audit/checklist-form";

export default async function IsAuditPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  // IS Auditor can access, or admin:system
  const canAccess =
    hasPermission(userRoles, "concurrent_audit:read") ||
    hasPermission(userRoles, "admin:system");

  if (!canAccess) {
    redirect("/dashboard");
  }

  // Mock data - replace with actual data-access calls
  const applications: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">IS/EDP Audit</h1>
        <p className="text-muted-foreground">
          Information Systems audit, application inventory, and security checklists
        </p>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="inventory">Application Inventory</TabsTrigger>
          <TabsTrigger value="checklist">Audit Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <AppInventoryTable applications={applications} />
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4">
          <ChecklistForm />
        </TabsContent>
      </Tabs>
    </div>
  );
}
