"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createCalendarEvent, deleteCalendarEvent } from "@/actions/admin/manage-calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Trash2, Calendar as CalendarIcon } from "@/lib/icons";
import { toast } from "sonner";

interface CalendarViewProps {
  events: Array<{
    id: string;
    title: string;
    eventType: string;
    startDate: Date;
    endDate: Date | null;
    allDay: boolean;
    description: string | null;
    branch: { name: string; code: string } | null;
    engagement: { auditNumber: string | null } | null;
  }>;
  canManage: boolean;
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  RBIA: "bg-blue-100 text-blue-800 border-blue-300",
  CONCURRENT: "bg-purple-100 text-purple-800 border-purple-300",
  IS_EDP: "bg-cyan-100 text-cyan-800 border-cyan-300",
  STATUTORY: "bg-orange-100 text-orange-800 border-orange-300",
  MEETING: "bg-green-100 text-green-800 border-green-300",
};

export function CalendarView({ events, canManage }: CalendarViewProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [filterType, setFilterType] = React.useState<string>("all");

  // Form state
  const [title, setTitle] = React.useState("");
  const [eventType, setEventType] = React.useState<string>("RBIA");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [allDay, setAllDay] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [recurrenceRule, setRecurrenceRule] = React.useState("");

  // Filter events by type
  const filteredEvents = React.useMemo(() => {
    if (filterType === "all") return events;
    return events.filter((e) => e.eventType === filterType);
  }, [events, filterType]);

  // Group by month
  const groupedEvents = React.useMemo(() => {
    const groups = new Map<string, typeof filteredEvents>();
    for (const event of filteredEvents) {
      const monthKey = new Date(event.startDate).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
      });
      if (!groups.has(monthKey)) groups.set(monthKey, []);
      groups.get(monthKey)!.push(event);
    }
    // Sort groups by date descending
    return Array.from(groups.entries()).sort(
      (a, b) =>
        new Date(b[1][0].startDate).getTime() - new Date(a[1][0].startDate).getTime()
    );
  }, [filteredEvents]);

  const handleCreate = async () => {
    if (!title.trim() || !startDate) {
      toast.error("Please provide title and start date");
      return;
    }

    setIsSubmitting(true);
    const result = await createCalendarEvent({
      title,
      eventType: eventType as any,
      startDate: new Date(startDate).toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
      allDay,
      description: description || undefined,
      recurrenceRule: recurrenceRule || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast.success("Calendar event created");
      setDialogOpen(false);
      setTitle("");
      setEventType("RBIA");
      setStartDate("");
      setEndDate("");
      setDescription("");
      setRecurrenceRule("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm("Delete this calendar event?")) return;

    const result = await deleteCalendarEvent(eventId);
    if (result.success) {
      toast.success("Event deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label>Filter:</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="RBIA">RBIA</SelectItem>
              <SelectItem value="CONCURRENT">Concurrent</SelectItem>
              <SelectItem value="IS_EDP">IS/EDP</SelectItem>
              <SelectItem value="STATUTORY">Statutory</SelectItem>
              <SelectItem value="MEETING">Meeting</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Calendar Event</DialogTitle>
                <DialogDescription>
                  Schedule an audit engagement or meeting.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="RBIA Audit - Branch XYZ"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="type">Event Type</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RBIA">RBIA</SelectItem>
                      <SelectItem value="CONCURRENT">Concurrent</SelectItem>
                      <SelectItem value="IS_EDP">IS/EDP Audit</SelectItem>
                      <SelectItem value="STATUTORY">Statutory</SelectItem>
                      <SelectItem value="MEETING">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="start">Start Date</Label>
                    <Input
                      id="start"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">End Date</Label>
                    <Input
                      id="end"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
                {/* Periodicity / Recurrence Rule (R70) */}
                <div className="space-y-2">
                  <Label htmlFor="recurrence">Recurrence (optional)</Label>
                  <Select value={recurrenceRule} onValueChange={setRecurrenceRule}>
                    <SelectTrigger id="recurrence">
                      <SelectValue placeholder="No recurrence" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None (one-time)</SelectItem>
                      <SelectItem value="WEEKLY">Weekly</SelectItem>
                      <SelectItem value="BIWEEKLY">Every 2 Weeks</SelectItem>
                      <SelectItem value="MONTHLY">Monthly</SelectItem>
                      <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                      <SelectItem value="HALF_YEARLY">Half-Yearly</SelectItem>
                      <SelectItem value="ANNUAL">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Events list grouped by month */}
      <div className="space-y-6">
        {groupedEvents.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              No calendar events found.
            </CardContent>
          </Card>
        ) : (
          groupedEvents.map(([month, monthEvents]) => (
            <div key={month} className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">{month}</h2>
              <div className="space-y-2">
                {monthEvents.map((event) => (
                  <Card key={event.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <CardTitle className="text-base">{event.title}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={EVENT_TYPE_COLORS[event.eventType] ?? ""}
                            >
                              {event.eventType.replace(/_/g, " ")}
                            </Badge>
                            {event.branch && (
                              <span className="text-sm text-muted-foreground">
                                {event.branch.code}
                              </span>
                            )}
                          </div>
                        </div>
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(event.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          {new Date(event.startDate).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {event.endDate && (
                          <>
                            <span>→</span>
                            <span>
                              {new Date(event.endDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </>
                        )}
                      </div>
                      {event.description && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {event.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
