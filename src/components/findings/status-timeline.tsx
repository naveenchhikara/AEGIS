import type { FindingTimeline } from "@/types";
import { formatDate } from "@/lib/utils";

interface StatusTimelineProps {
  events: FindingTimeline[];
}

export function StatusTimeline({ events }: StatusTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No timeline events recorded.
      </p>
    );
  }

  const sorted = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <div className="relative space-y-0">
      {sorted.map((event, index) => {
        const isFirst = index === 0;
        const isLast = index === sorted.length - 1;

        return (
          <div key={event.id} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Vertical connecting line */}
            {!isLast && (
              <div className="absolute left-[7px] top-4 h-full w-px bg-border" />
            )}

            {/* Timeline dot */}
            <div
              className={`relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                isFirst
                  ? "border-primary bg-primary"
                  : isLast
                    ? "border-emerald-500 bg-background"
                    : "border-primary bg-background"
              }`}
            />

            {/* Content */}
            <div className="flex flex-col gap-0.5">
              <time className="text-xs font-medium text-muted-foreground">
                {formatDate(event.date, "long")}
              </time>
              <p className="text-sm">{event.action}</p>
              <p className="text-xs text-muted-foreground">by {event.actor}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
