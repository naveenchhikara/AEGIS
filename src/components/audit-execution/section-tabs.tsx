"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { initializeSections } from "@/actions/audit-execution/initialize-sections";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Plus } from "@/lib/icons";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SectionTabsProps {
  engagementId: string;
  sections: Array<{
    id: string;
    sectionCode: string;
    sectionName: string;
    status: string;
    completedAt: Date | null;
    reviewedAt: Date | null;
    assignedToId?: string | null;
    assignedToName?: string | null;
    sectionData?: Record<string, unknown> | null;
  }>;
  canManageSections: boolean;
}

const STATUS_DOT_COLORS: Record<string, string> = {
  NOT_STARTED: "bg-gray-400",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-green-500",
  REVIEWED: "bg-purple-500",
};

export function SectionTabs({
  engagementId,
  sections,
  canManageSections,
}: SectionTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isInitializing, setIsInitializing] = React.useState(false);

  async function handleInitialize() {
    setIsInitializing(true);
    const result = await initializeSections({ engagementId });
    setIsInitializing(false);

    if (result.success) {
      toast.success(
        `Initialized ${result.data.created} sections (${result.data.skipped} already existed)`,
      );
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  if (sections.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Audit Sections</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center">
            <p className="text-muted-foreground mb-4">
              No sections have been initialized for this engagement.
            </p>
            {canManageSections && (
              <Button onClick={handleInitialize} disabled={isInitializing}>
                {isInitializing && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {!isInitializing && <Plus className="mr-2 h-4 w-4" />}
                Initialize Sections
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Audit Sections</CardTitle>
          <p className="text-muted-foreground text-sm">
            {sections.length} functional areas
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => {
              const isActive = pathname.includes(
                `/sections/${section.sectionCode}`,
              );
              return (
                <Button
                  key={section.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    router.push(
                      `/audit-execution/${engagementId}/sections/${section.sectionCode}`,
                    )
                  }
                  className={cn(
                    "relative flex items-center gap-2",
                    !isActive && "hover:bg-muted",
                  )}
                >
                  {/* Status indicator dot */}
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      STATUS_DOT_COLORS[section.status] ?? "bg-gray-400",
                    )}
                  />
                  <span className="text-xs">{section.sectionCode}</span>
                  {section.assignedToName && (
                    <span className="text-muted-foreground ml-1 text-[10px]">
                      ({section.assignedToName.split(" ")[0]})
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>

        {/* Legend */}
        <div className="text-muted-foreground mt-4 flex flex-wrap gap-4 border-t pt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            Not Started
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            In Progress
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            Completed
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500" />
            Reviewed
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
