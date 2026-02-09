"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface EmptyStateCardProps {
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
  icon?: ReactNode;
}

export function EmptyStateCard({
  title,
  message,
  actionLabel,
  actionHref,
  icon,
}: EmptyStateCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        {icon && <div className="text-muted-foreground mb-3">{icon}</div>}
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground mt-1 max-w-sm text-xs">{message}</p>
        {actionLabel && actionHref && (
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
