"use client";

import * as React from "react";
import { demoComplianceRequirements } from "@/data";
import type { ComplianceData } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRight } from "@/lib/icons";

const compData = demoComplianceRequirements as unknown as ComplianceData;

// Sort by due date and get upcoming deadlines
const upcomingDeadlines = compData.complianceRequirements
  .filter((req) => req.dueDate && req.status !== "compliant")
  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
  .slice(0, 5);

export function RegulatoryCalendar() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Regulatory Calendar</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[200px]">
          {upcomingDeadlines.length > 0 ? (
            <ul className="space-y-3">
              {upcomingDeadlines.map((req) => {
                const statusColors: Record<string, string> = {
                  compliant: "border-l-green-500",
                  partial: "border-l-amber-500",
                  "non-compliant": "border-l-red-500",
                  pending: "border-l-blue-500",
                };
                const borderClass =
                  statusColors[req.status as keyof typeof statusColors] ||
                  "border-l-blue-500";

                return (
                  <li
                    key={req.id}
                    className={`hover:bg-muted/50 cursor-pointer border-l-2 pl-3 transition-colors duration-150 ${borderClass}`}
                  >
                    <div className="text-muted-foreground text-xs">
                      {req.dueDate}
                    </div>
                    <div className="text-sm font-medium">{req.title}</div>
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          req.status === "partial"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100"
                            : req.status === "non-compliant"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-100"
                              : req.status === "pending"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-100"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-100"
                        }`}
                      >
                        {req.status.charAt(0).toUpperCase() +
                          req.status.slice(1).replace("-", " ")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-muted-foreground py-4 text-center text-sm">
              No upcoming deadlines
            </div>
          )}
        </ScrollArea>
        <div className="mt-3 border-t pt-3">
          <a
            href="/compliance"
            className="flex items-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View All
            <ArrowRight className="ml-1 h-4 w-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
