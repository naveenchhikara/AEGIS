import { getRequiredSession } from "@/data-access/session";
import { getAuditCalendarEvents } from "@/data-access/analytics";
import { CalendarView } from "@/components/calendar/calendar-view";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const session = await getRequiredSession();
  const userRoles = session.user.roles;
  const tenantId = session.user.tenantId;

  if (!hasPermission(userRoles, "calendar:manage")) {
    redirect("/dashboard");
  }

  // Fetch all calendar events (no date filter for initial load)
  const events = await getAuditCalendarEvents(tenantId);

  const canManage = hasPermission(userRoles, "calendar:manage");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit Calendar</h1>
          <p className="text-muted-foreground">
            Schedule and track audit engagements, meetings, and important dates
          </p>
        </div>
      </div>

      <CalendarView events={events} canManage={canManage} />
    </div>
  );
}
