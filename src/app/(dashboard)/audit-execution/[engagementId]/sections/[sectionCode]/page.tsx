import { getRequiredSession } from "@/data-access/session";
import { getExaminationResponsesForSection } from "@/data-access/audit-execution";
import { ExaminationForm } from "@/components/audit-execution/examination-form";
import { hasPermission, type Role } from "@/lib/permissions";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "@/lib/icons";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface PageProps {
  params: Promise<{ engagementId: string; sectionCode: string }>;
}

export default async function SectionDetailPage({ params }: PageProps) {
  const { engagementId, sectionCode } = await params;
  const session = await getRequiredSession();
  const userRoles = ((session.user as any).roles ?? []) as Role[];

  if (!hasPermission(userRoles, "examination:read")) {
    redirect("/dashboard");
  }

  const data = await getExaminationResponsesForSection(
    session,
    engagementId,
    sectionCode,
  );
  if (!data) {
    notFound();
  }

  const canRespond = hasPermission(userRoles, "examination:respond");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/audit-execution/${engagementId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Engagement
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-xl font-semibold">{data.area.name}</h2>
        <p className="text-muted-foreground">
          {data.items.length} examination items • Section {data.area.code}
        </p>
      </div>

      <ExaminationForm
        engagementId={engagementId}
        areaCode={sectionCode}
        items={data.items}
        canRespond={canRespond}
      />
    </div>
  );
}
