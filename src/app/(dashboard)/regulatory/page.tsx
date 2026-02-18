import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { RegulatoryTable } from "@/components/regulatory/regulatory-table";

export default async function RegulatoryPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "regulatory:read")) {
    redirect("/dashboard");
  }

  // Mock data - replace with actual data-access calls
  const observations: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Regulatory Observations</h1>
        <p className="text-muted-foreground">
          RBI/SEBI observations tracking and Action Taken Report (ATR) management
        </p>
      </div>
      <RegulatoryTable observations={observations} />
    </div>
  );
}
