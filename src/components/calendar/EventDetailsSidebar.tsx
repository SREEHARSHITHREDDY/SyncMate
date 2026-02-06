import { useState } from "react";
import { format, parseISO } from "date-fns";
import { EventWithResponse } from "@/hooks/useEvents";
import { Calendar, Clock, Repeat, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MeetingMinutesDialog } from "@/components/MeetingMinutesDialog";

interface EventDetailsSidebarProps {
  event: EventWithResponse & { isCancelled?: boolean };
}

export function EventDetailsSidebar({ event }: EventDetailsSidebarProps) {
  const [showMinutesDialog, setShowMinutesDialog] = useState(false);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return <Badge variant="secondary" className="bg-blue-500/20 text-blue-600">Low Priority</Badge>;
      case "high":
        return <Badge variant="secondary" className="bg-red-500/20 text-red-600">High Priority</Badge>;
      default:
        return <Badge variant="secondary" className="bg-orange-500/20 text-orange-600">Medium Priority</Badge>;
    }
  };

  const isInactive = event.isCancelled || event.is_completed;

  return (
    <div className={`space-y-4 ${isInactive ? "opacity-60" : ""}`}>
      <div>
        <h3 className={`text-lg font-semibold ${isInactive ? "line-through" : ""}`}>
          {event.title}
        </h3>
        {getPriorityBadge(event.priority)}
      </div>

      {event.description && (
        <p className={`text-sm text-muted-foreground ${isInactive ? "line-through" : ""}`}>
          {event.description}
        </p>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{format(parseISO(event.event_date), "EEEE, d MMMM yyyy")}</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span>{event.event_time.slice(0, 5)}</span>
        </div>

        {event.recurrence_type && (
          <div className="flex items-center gap-3 text-sm">
            <Repeat className="h-4 w-4 text-muted-foreground" />
            <span className="capitalize">Repeats {event.recurrence_type}</span>
          </div>
        )}
      </div>

      {event.isCancelled && (
        <Badge variant="destructive">Cancelled</Badge>
      )}

      {event.is_completed && !event.isCancelled && (
        <Badge variant="secondary">Completed</Badge>
      )}

      {/* Meeting Minutes Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2"
        onClick={() => setShowMinutesDialog(true)}
      >
        <FileText className="h-4 w-4" />
        Meeting Minutes
      </Button>

      {/* Meeting Minutes Dialog */}
      <MeetingMinutesDialog
        eventId={event.id}
        eventTitle={event.title}
        eventDate={format(parseISO(event.event_date), "MMMM d, yyyy")}
        open={showMinutesDialog}
        onOpenChange={setShowMinutesDialog}
        canEdit={event.isCreator || event.response === "yes"}
      />
    </div>
  );
}
