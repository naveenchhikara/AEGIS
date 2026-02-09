"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Calendar } from "@/lib/icons";

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" className="h-10 cursor-pointer" asChild>
        <Link href="/findings">
          <Plus />
          New Finding
        </Link>
      </Button>

      <Button variant="outline" className="h-10 cursor-pointer" asChild>
        <Link href="/compliance">
          <Zap />
          New Compliance Task
        </Link>
      </Button>

      <Button variant="outline" className="h-10 cursor-pointer" asChild>
        <Link href="/audit-plans">
          <Calendar />
          View Audit Plan
        </Link>
      </Button>
    </div>
  );
}
