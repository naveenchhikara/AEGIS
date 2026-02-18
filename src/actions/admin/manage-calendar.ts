"use server";

import { z } from "zod";
import { prismaForTenant } from "@/lib/prisma";
import { getRequiredSession } from "@/data-access/session";
import { hasPermission } from "@/lib/permissions";
import { logger } from "@/lib/logger";
import { revalidatePath } from "next/cache";

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  eventType: z.enum(["RBIA", "CONCURRENT", "IS_EDP", "STATUTORY", "MEETING"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  allDay: z.boolean().default(false),
  branchId: z.string().uuid().optional(),
  engagementId: z.string().uuid().optional(),
  recurrenceRule: z.string().optional(),
  description: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
});

export async function createCalendarEvent(input: z.infer<typeof createEventSchema>) {
  const session = await getRequiredSession();
  const user = session.user as any;
  if (!user.tenantId) return { success: false as const, error: "No tenant" };
  const db = prismaForTenant(user.tenantId);
  if (!hasPermission(user.roles ?? [], "calendar:manage"))
    return { success: false as const, error: "Forbidden" };

  const parsed = createEventSchema.safeParse(input);
  if (!parsed.success) return { success: false as const, error: parsed.error.message };

  try {
    const event = await db.auditCalendar.create({
      data: {
        tenantId: user.tenantId,
        ...parsed.data,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
      },
    });
    logger.info({ eventId: event.id }, "Calendar event created");
    revalidatePath("/calendar");
    return { success: true as const, data: event };
  } catch (error) {
    logger.error({ error }, "Failed to create calendar event");
    return { success: false as const, error: "Failed to create event" };
  }
}

const deleteEventSchema = z.object({
  eventId: z.string().uuid("Invalid event ID"),
});

export async function deleteCalendarEvent(eventId: string) {
  const session = await getRequiredSession();
  const user = session.user as any;
  if (!user.tenantId) return { success: false as const, error: "No tenant" };

  const parsed = deleteEventSchema.safeParse({ eventId });
  if (!parsed.success) return { success: false as const, error: parsed.error.issues[0].message };

  const db = prismaForTenant(user.tenantId);
  if (!hasPermission(user.roles ?? [], "calendar:manage"))
    return { success: false as const, error: "Forbidden" };

  try {
    // SECURITY: Scope delete to tenant to prevent cross-tenant deletion
    await db.auditCalendar.deleteMany({ where: { id: eventId, tenantId: user.tenantId } });
    revalidatePath("/calendar");
    return { success: true as const, data: null };
  } catch (error) {
    logger.error({ error, eventId }, "Failed to delete calendar event");
    return { success: false as const, error: "Failed to delete event" };
  }
}
