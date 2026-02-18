import { getRequiredSession } from "@/data-access/session";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { InvestmentTable } from "@/components/investments/investment-table";

export default async function InvestmentsPage() {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "risk_mis:read")) {
    redirect("/dashboard");
  }

  // Mock data - replace with actual data-access calls
  const investments: any[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Investment & Treasury</h1>
        <p className="text-muted-foreground">
          Investment portfolio monitoring, broker management, and treasury compliance
        </p>
      </div>
      <InvestmentTable investments={investments} />
    </div>
  );
}
