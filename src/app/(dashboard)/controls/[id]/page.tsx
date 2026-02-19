import { getRequiredSession } from "@/data-access/session";
import { getControl } from "@/data-access/control-library";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import { ControlDetailView } from "@/components/controls/control-detail-view";

interface ControlDetailPageProps {
  params: { id: string };
}

export default async function ControlDetailPage({
  params,
}: ControlDetailPageProps) {
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "control_library:read")) {
    redirect("/dashboard");
  }

  const canManage = hasPermission(userRoles, "control_library:manage");

  const control = await getControl(session, params.id);

  if (!control) {
    notFound();
  }

  return <ControlDetailView control={control} canManage={canManage} />;
}
