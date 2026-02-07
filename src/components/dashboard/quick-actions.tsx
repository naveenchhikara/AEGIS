"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Calendar } from "@/lib/icons";

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Button
        variant="outline"
        size="lg"
        className="w-full cursor-pointer"
        asChild
      >
        <Link href="/findings">
          <Plus className="mr-2 h-5 w-5" />
          New Finding
        </Link>
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="w-full cursor-pointer"
        asChild
      >
        <Link href="/compliance">
          <Zap className="mr-2 h-5 w-5" />
          New Compliance Task
        </Link>
      </Button>

      <Button
        variant="outline"
        size="lg"
        className="w-full cursor-pointer"
        asChild
      >
        <Link href="/audit-plans">
          <Calendar className="mr-2 h-5 w-5" />
          View Audit Plan
        </Link>
      </Button>
    </div>
  );
}
