import "server-only";
import { prismaForTenant } from "./prisma";
import type { Session } from "@/lib/auth";

/**
 * Get all issues with filters.
 */
export async function getIssues(
  session: Session,
  options?: {
    source?: string;
    issueType?: string;
    severity?: string;
    status?: string;
    riskTheme?: string;
    ownerId?: string;
  },
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.issue.findMany({
    where: {
      tenantId,
      ...(options?.source && { source: options.source }),
      ...(options?.issueType && { issueType: options.issueType }),
      ...(options?.severity && { severity: options.severity }),
      ...(options?.status && { status: options.status }),
      ...(options?.riskTheme && { riskTheme: options.riskTheme }),
      ...(options?.ownerId && { ownerId: options.ownerId }),
    },
    include: {
      observation: {
        select: {
          id: true,
          title: true,
          severity: true,
          branch: {
            select: { code: true, name: true },
          },
        },
      },
      control: {
        select: {
          id: true,
          controlCode: true,
          processArea: true,
          description: true,
        },
      },
      actionPlans: {
        where: { status: { in: ["PENDING", "IN_PROGRESS"] } },
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          completionPct: true,
          evidence: true,
          verifiedById: true,
          verifiedAt: true,
        },
        orderBy: { dueDate: "asc" },
      },
    },
    orderBy: [{ status: "asc" }, { severity: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Get a single issue by ID.
 */
export async function getIssue(session: Session, issueId: string) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.issue.findFirst({
    where: { id: issueId, tenantId },
    include: {
      observation: {
        select: {
          id: true,
          title: true,
          condition: true,
          criteria: true,
          cause: true,
          effect: true,
          recommendation: true,
          severity: true,
          branch: {
            select: { code: true, name: true },
          },
          engagement: {
            select: { id: true, auditNumber: true },
          },
        },
      },
      control: {
        select: {
          id: true,
          controlCode: true,
          processArea: true,
          controlType: true,
          description: true,
          riskRegister: {
            select: {
              id: true,
              riskStatement: true,
              riskCategory: true,
            },
          },
        },
      },
      actionPlans: {
        orderBy: { dueDate: "asc" },
      },
    },
  });
}

/**
 * Get all action plans with filters.
 */
export async function getActionPlans(
  session: Session,
  options?: {
    issueId?: string;
    assignedToId?: string;
    status?: string;
    overdue?: boolean;
  },
) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  const now = new Date();

  return db.actionPlan.findMany({
    where: {
      tenantId,
      ...(options?.issueId && { issueId: options.issueId }),
      ...(options?.assignedToId && { assignedToId: options.assignedToId }),
      ...(options?.status && { status: options.status }),
      ...(options?.overdue && {
        dueDate: { lt: now },
        status: { in: ["PENDING", "IN_PROGRESS"] },
      }),
    },
    include: {
      issue: {
        select: {
          id: true,
          title: true,
          severity: true,
          source: true,
          status: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
  });
}

/**
 * Get a single action plan by ID.
 */
export async function getActionPlan(session: Session, actionPlanId: string) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.actionPlan.findFirst({
    where: { id: actionPlanId, tenantId },
    include: {
      issue: {
        select: {
          id: true,
          title: true,
          description: true,
          severity: true,
          source: true,
          issueType: true,
          riskTheme: true,
          rootCause: true,
          observation: {
            select: {
              id: true,
              title: true,
              branch: {
                select: { code: true, name: true },
              },
            },
          },
          control: {
            select: {
              id: true,
              controlCode: true,
              description: true,
            },
          },
        },
      },
    },
  });
}

/**
 * Get open issues by source for dashboard.
 */
export async function getIssuesBySource(session: Session) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  const issues = await db.issue.findMany({
    where: {
      tenantId,
      status: { in: ["OPEN", "IN_PROGRESS"] },
    },
    select: {
      source: true,
      severity: true,
    },
  });

  // Group by source and severity
  const grouped = issues.reduce((acc: Record<string, any>, issue) => {
    if (!acc[issue.source]) {
      acc[issue.source] = {
        source: issue.source,
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };
    }

    acc[issue.source].total++;
    acc[issue.source][issue.severity.toLowerCase()]++;

    return acc;
  }, {});

  return Object.values(grouped);
}

/**
 * Get overdue action plans for escalation.
 */
export async function getOverdueActionPlans(session: Session) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  const now = new Date();

  return db.actionPlan.findMany({
    where: {
      tenantId,
      dueDate: { lt: now },
      status: { in: ["PENDING", "IN_PROGRESS"] },
    },
    include: {
      issue: {
        select: {
          id: true,
          title: true,
          severity: true,
          ownerId: true,
        },
      },
    },
    orderBy: { dueDate: "asc" },
  });
}

/**
 * Get issues linked to a specific control for control effectiveness analysis.
 */
export async function getIssuesByControl(session: Session, controlId: string) {
  const tenantId = (session.user as any).tenantId as string;
  const db = prismaForTenant(tenantId);

  return db.issue.findMany({
    where: {
      tenantId,
      controlId,
    },
    include: {
      actionPlans: {
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
          completionPct: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
