"use client";

import * as React from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

interface Meeting {
  id: string;
  committeeId: string;
  meetingDate: Date;
  status: string;
  committee: {
    name: string;
  };
}

interface BoardReviewCalendarProps {
  meetings: Meeting[];
  canManage: boolean;
}

interface RbiMandatedItem {
  title: string;
  frequency: "QUARTERLY" | "ANNUAL" | "HALF_YEARLY" | "AS_NEEDED";
  months: number[];
}

const RBI_MANDATED_ITEMS: RbiMandatedItem[] = [
  {
    title: "ACB Meeting — Quarterly Review",
    frequency: "QUARTERLY",
    months: [3, 6, 9, 12],
  },
  { title: "IS Audit Report to Board", frequency: "ANNUAL", months: [3] },
  {
    title: "Concurrent Audit Report",
    frequency: "QUARTERLY",
    months: [3, 6, 9, 12],
  },
  { title: "RBIA Plan Approval", frequency: "ANNUAL", months: [3] },
  { title: "Risk Management Policy Review", frequency: "ANNUAL", months: [6] },
  { title: "KYC/AML Policy Review", frequency: "ANNUAL", months: [9] },
  { title: "Cyber Security Review", frequency: "HALF_YEARLY", months: [3, 9] },
  { title: "Investment Policy Review", frequency: "ANNUAL", months: [6] },
  {
    title: "Statutory Audit Report Discussion",
    frequency: "ANNUAL",
    months: [6],
  },
  {
    title: "RBI Inspection Report Discussion",
    frequency: "AS_NEEDED",
    months: [],
  },
];

const STATUS_ICONS = {
  COMPLETED: { icon: CheckCircle, className: "text-green-600" },
  SCHEDULED: { icon: Clock, className: "text-blue-600" },
  MISSING: { icon: XCircle, className: "text-red-600" },
};

export function BoardReviewCalendar({
  meetings,
  canManage,
}: BoardReviewCalendarProps) {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  function goToPreviousMonth() {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1),
    );
  }

  function goToNextMonth() {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1),
    );
  }

  function getMeetingsForDate(date: Date) {
    return meetings.filter((m) => isSameDay(new Date(m.meetingDate), date));
  }

  function getMandatedItemStatus(
    item: RbiMandatedItem,
    year: number,
    month: number,
  ) {
    if (item.frequency === "AS_NEEDED") {
      return "AS_NEEDED";
    }

    if (!item.months.includes(month)) {
      return null; // Not required this month
    }

    const hasCompleted = meetings.some(
      (m) =>
        m.status === "COMPLETED" &&
        new Date(m.meetingDate).getFullYear() === year &&
        new Date(m.meetingDate).getMonth() + 1 === month &&
        m.committee.name.includes("ACB"),
    );

    if (hasCompleted) return "COMPLETED";

    const hasScheduled = meetings.some(
      (m) =>
        m.status === "SCHEDULED" &&
        new Date(m.meetingDate).getFullYear() === year &&
        new Date(m.meetingDate).getMonth() + 1 === month &&
        m.committee.name.includes("ACB"),
    );

    if (hasScheduled) return "SCHEDULED";

    const now = new Date();
    const itemDate = new Date(year, month - 1, 1);
    if (itemDate < now) {
      return "MISSING"; // Past due
    }

    return null;
  }

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Board Review Calendar
        </h2>
        <p className="text-muted-foreground">
          Scheduled meetings and RBI-mandated board items
        </p>
      </div>

      {/* Month Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{format(currentDate, "MMMM yyyy")}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCurrentDate(new Date())}
              >
                Today
              </Button>
              <Button size="sm" variant="outline" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-muted-foreground p-2 text-center text-sm font-medium"
              >
                {day}
              </div>
            ))}
            {calendarDays.map((day) => {
              const dayMeetings = getMeetingsForDate(day);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate && isSameDay(day, selectedDate);

              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "relative min-h-[60px] rounded-md border border-transparent p-2 text-sm transition-colors",
                    !isSameMonth(day, currentDate) &&
                      "text-muted-foreground opacity-50",
                    isToday && "bg-primary/10 border-primary",
                    isSelected && "bg-accent",
                    dayMeetings.length > 0 &&
                      "border-blue-300 bg-blue-50 dark:bg-blue-950",
                    "hover:bg-accent",
                  )}
                >
                  <span
                    className={cn("font-medium", isToday && "text-primary")}
                  >
                    {format(day, "d")}
                  </span>
                  {dayMeetings.length > 0 && (
                    <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
                      {dayMeetings.slice(0, 3).map((_, i) => (
                        <div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-blue-600"
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Date Meetings */}
          {selectedDate && (
            <div className="bg-muted/50 mt-4 rounded-lg border p-4">
              <h4 className="mb-2 font-medium">
                {format(selectedDate, "PPP")}
              </h4>
              {getMeetingsForDate(selectedDate).length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No meetings scheduled
                </p>
              ) : (
                <ul className="space-y-2">
                  {getMeetingsForDate(selectedDate).map((meeting) => (
                    <li
                      key={meeting.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {meeting.committee.name}
                      </span>
                      <Badge variant="outline">{meeting.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RBI Mandated Items */}
      <Card>
        <CardHeader>
          <CardTitle>RBI-Mandated Board Items</CardTitle>
          <CardDescription>
            Regulatory requirements for board meetings and reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {RBI_MANDATED_ITEMS.map((item, index) => {
              const status = getMandatedItemStatus(
                item,
                currentYear,
                currentMonth,
              );
              const StatusIcon =
                status && status !== "AS_NEEDED"
                  ? STATUS_ICONS[status as keyof typeof STATUS_ICONS]
                  : null;

              return (
                <div
                  key={index}
                  className={cn(
                    "flex items-start justify-between rounded-lg border p-3",
                    status === "COMPLETED" &&
                      "border-green-300 bg-green-50 dark:bg-green-950",
                    status === "SCHEDULED" &&
                      "border-blue-300 bg-blue-50 dark:bg-blue-950",
                    status === "MISSING" &&
                      "border-red-300 bg-red-50 dark:bg-red-950",
                  )}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {item.frequency.replace("_", " ")}
                      </Badge>
                    </div>
                    {item.months.length > 0 && (
                      <p className="text-muted-foreground mt-1 text-xs">
                        Required in:{" "}
                        {item.months
                          .map((m) => format(new Date(2024, m - 1, 1), "MMM"))
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {StatusIcon && (
                      <div className="flex items-center gap-1">
                        <StatusIcon.icon
                          className={cn("h-4 w-4", StatusIcon.className)}
                        />
                        <span className="text-xs font-medium">{status}</span>
                      </div>
                    )}
                    {status === "MISSING" && canManage && (
                      <Button size="sm" variant="outline">
                        Schedule
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
