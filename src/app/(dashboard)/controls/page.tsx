import { getRequiredSession } from "@/data-access/session";
import { getControls, getTestProcedures } from "@/data-access/control-library";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { ControlLibraryTable } from "@/components/controls/control-library-table";
import { TestProceduresTab } from "@/components/controls/test-procedures-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function ControlsPage() {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;

  if (!hasPermission(userRoles, "control_library:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "control_library:manage");

  // Fetch real controls and test procedures from database
  const controls = await getControls(session);
  const testProcedures = await getTestProcedures(session);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight md:text-2xl">
          Control Library
        </h1>
        <p className="text-muted-foreground">
          Internal control framework and effectiveness assessments
        </p>
      </div>

      <Tabs defaultValue="controls" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="controls">
            Controls ({controls.length})
          </TabsTrigger>
          <TabsTrigger value="procedures">
            Test Procedures ({testProcedures.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="space-y-4">
          <ControlLibraryTable controls={controls} canManage={canManage} />
        </TabsContent>

        <TabsContent value="procedures" className="space-y-4">
          <TestProceduresTab
            testProcedures={testProcedures}
            controls={controls.map((c) => ({
              id: c.id,
              controlCode: c.controlCode,
              description: c.description,
            }))}
            canManage={canManage}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
