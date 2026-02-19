import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { getConcurrentAuditTemplates, getConcurrentFindingsForDedup } from "@/data-access/concurrent-audit";
import { prismaForTenant } from "@/data-access/prisma";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TemplateManager } from "@/components/concurrent-audit/template-manager";
import { RapidEntryWorkbench } from "@/components/concurrent-audit/rapid-entry-workbench";
import { DedupFindingsPanel } from "@/components/concurrent-audit/dedup-findings-panel";

export default async function ConcurrentAuditPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];
  
  if (!hasPermission(userRoles, "concurrent_audit:read")) {
    redirect("/dashboard");
  }
  
  const canExecute = hasPermission(userRoles, "concurrent_audit:execute");

  const templates = await getConcurrentAuditTemplates(session, { isActive: true });
  
  // Fetch branches for rapid entry
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);
  
  const branches = await db.branch.findMany({
    where: { tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });
  
  // Fetch concurrent findings with RBIA duplicate detection (R76)
  const concurrentObs = await getConcurrentFindingsForDedup(session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Concurrent Audit</h1>
        <p className="text-muted-foreground">
          Scope templates, rapid observations, and irregularity escalation
        </p>
      </div>
      
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="templates">Scope Templates</TabsTrigger>
          <TabsTrigger value="rapid-entry">Rapid Entry</TabsTrigger>
          <TabsTrigger value="dedup">Findings De-dup</TabsTrigger>
        </TabsList>
        
        <TabsContent value="templates">
          <TemplateManager templates={templates} canExecute={canExecute} />
        </TabsContent>
        
        <TabsContent value="rapid-entry">
          <RapidEntryWorkbench 
            templates={templates} 
            branches={branches} 
            canExecute={canExecute} 
          />
        </TabsContent>
        
        <TabsContent value="dedup">
          <DedupFindingsPanel findings={concurrentObs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
