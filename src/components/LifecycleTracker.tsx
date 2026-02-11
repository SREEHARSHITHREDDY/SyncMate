import { Badge } from "@/components/ui/badge";
import { LIFECYCLE_LABELS, LIFECYCLE_ORDER, LifecycleStatus } from "@/hooks/usePlanLifecycle";
import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface LifecycleTrackerProps {
  currentStatus: LifecycleStatus;
}

export function LifecycleTracker({ currentStatus }: LifecycleTrackerProps) {
  const currentIndex = LIFECYCLE_ORDER.indexOf(currentStatus);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-medium">Plan Lifecycle</p>
      <div className="flex items-center gap-1 flex-wrap">
        {LIFECYCLE_ORDER.map((status, i) => {
          const isPast = i < currentIndex;
          const isCurrent = i === currentIndex;
          return (
            <Badge
              key={status}
              variant="outline"
              className={cn(
                "text-xs gap-1 transition-all",
                isPast && "bg-primary/10 border-primary/30 text-primary",
                isCurrent && "bg-primary text-primary-foreground border-primary",
                !isPast && !isCurrent && "text-muted-foreground"
              )}
            >
              {isPast && <CheckCircle2 className="h-3 w-3" />}
              {LIFECYCLE_LABELS[status]}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
