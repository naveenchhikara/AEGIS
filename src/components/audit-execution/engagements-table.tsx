"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

interface EngagementRow {
  id: string;
  status: string;
  auditNumber?: string | null;
  auditType?: string | null;
  scheduledStartDate?: Date | string | null;
  actualEndDate?: Date | string | null;
  createdAt: Date | string;
  branch?: {
    id: string;
    name: string;
    code: string;
    city?: string | null;
  } | null;
  auditArea?: { id: string; name: string } | null;
  auditPlan?: { id: string; year: number; quarter: string } | null;
  teamMembers?: { user: { id: string; name: string } }[];
}

interface EngagementsTableProps {
  engagements: EngagementRow[];
}

const STATUS_STYLES: Record<string, string> = {
  PLANNED: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function EngagementsTable({ engagements }: EngagementsTableProps) {
  const router = useRouter();

  if (engagements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
        <p className="text-muted-foreground text-sm">
          No audit engagements yet.
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Create your first engagement from Audit Plans or click &quot;Create
          Engagement&quot; above.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Branch</TableHead>
            <TableHead className="hidden md:table-cell">Audit Area</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden lg:table-cell">Start Date</TableHead>
            <TableHead className="hidden lg:table-cell">Plan</TableHead>
            <TableHead className="hidden md:table-cell">Team</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {engagements.map((engagement) => (
            <TableRow
              key={engagement.id}
              className="cursor-pointer"
              onClick={() => router.push(`/audit-execution/${engagement.id}`)}
            >
              <TableCell>
                <div>
                  <p className="font-medium">
                    {engagement.branch?.name ?? "—"}
                  </p>
                  {engagement.auditNumber && (
                    <p className="text-muted-foreground text-xs">
                      {engagement.auditNumber}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {engagement.auditArea?.name ?? "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={STATUS_STYLES[engagement.status] ?? ""}
                >
                  {STATUS_LABELS[engagement.status] ?? engagement.status}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {engagement.scheduledStartDate
                  ? formatDate(engagement.scheduledStartDate)
                  : "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                {engagement.auditPlan
                  ? `FY ${engagement.auditPlan.year} ${engagement.auditPlan.quarter.split("_")[0]}`
                  : "—"}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {engagement.teamMembers?.length ?? 0} members
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
