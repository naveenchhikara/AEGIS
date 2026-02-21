"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RotateCcw, Loader2 } from "@/lib/icons";
import { toast } from "sonner";
import { generateWorkProgram } from "@/actions/work-program/generate-program";

interface RefreshWorkProgramButtonProps {
  engagementId: string;
}

export function RefreshWorkProgramButton({
  engagementId,
}: RefreshWorkProgramButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleRefresh() {
    setIsLoading(true);
    try {
      const result = await generateWorkProgram({
        engagementId,
        autoAssign: false,
      });

      if (result.success) {
        toast.success(
          result.data.created > 0
            ? `Work program refreshed — ${result.data.created} new items added`
            : "Work program is up to date — no new items to add",
        );
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to refresh work program");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RotateCcw className="mr-2 h-4 w-4" />
      )}
      Refresh Work Program
    </Button>
  );
}
