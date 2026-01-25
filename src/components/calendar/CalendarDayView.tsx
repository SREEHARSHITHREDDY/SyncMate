import { useMemo } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { EventWithResponse } from "@/hooks/useEvents";
import { getCategoryColor } from "@/lib/eventCategories";

interface CalendarDayViewProps {
  selectedDate: Date;
  events: (EventWithResponse & { isCancelled?: boolean })[];
  onEventClick?: (event: EventWithResponse) => void;
  onTimeSlotClick?: (date: Date, time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarDayView({ selectedDate, events, onEventClick, onTimeSlotClick }: CalendarDayViewProps) {
  const dayEvents = useMemo(() => {
    return events.filter((event) => {
      const eventDate = parseISO(event.event_date);
      return isSameDay(eventDate, selectedDate);
    });
  }, [events, selectedDate]);

  const allDayEvents = dayEvents.filter(e => e.event_time === "00:00:00" || e.event_time === "00:00");
  const timedEvents = dayEvents.filter(e => e.event_time !== "00:00:00" && e.event_time !== "00:00");

  const getEventPosition = (event: EventWithResponse) => {
    const [hours, minutes] = event.event_time.split(":").map(Number);
    return { top: hours * 60 + minutes, height: 60 }; // Assume 1 hour duration
  };

  const handleTimeSlotClick = (hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    onTimeSlotClick?.(selectedDate, timeStr);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-border pb-4 mb-4">
        <h2 className="text-2xl font-bold">{format(selectedDate, "d MMMM yyyy")}</h2>
        <p className="text-muted-foreground">{format(selectedDate, "EEEE")}</p>
      </div>

      {/* All-day events section */}
      {allDayEvents.length > 0 && (
        <div className="flex-shrink-0 mb-4">
          <div className="flex">
            <div className="w-16 text-xs text-muted-foreground pr-2 text-right">all-day</div>
            <div className="flex-1 space-y-1">
              {allDayEvents.map((event) => {
                const categoryColor = getCategoryColor((event as any).category);
                return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={`px-3 py-2 rounded text-white text-sm font-medium cursor-pointer transition-opacity hover:opacity-80 ${categoryColor} ${event.isCancelled || event.is_completed ? "opacity-50 line-through" : ""}`}
                  >
                    {event.title}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative" style={{ minHeight: `${24 * 60}px` }}>
          {/* Hour lines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex group"
              style={{ top: `${hour * 60}px`, height: "60px" }}
            >
              <div className="w-16 text-xs text-muted-foreground pr-2 text-right -mt-2">
                {format(new Date().setHours(hour, 0), "h a")}
              </div>
              <div 
                className="flex-1 border-t border-border/50 cursor-pointer hover:bg-primary/5 transition-colors"
                onClick={() => handleTimeSlotClick(hour)}
              >
                <div className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground p-1 transition-opacity">
                  + Add event
                </div>
              </div>
            </div>
          ))}

          {/* Events */}
          <div className="absolute left-16 right-0">
            {timedEvents.map((event) => {
              const { top, height } = getEventPosition(event);
              const isInactive = event.isCancelled || event.is_completed;
              const categoryColor = getCategoryColor((event as any).category);
              
              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  className={`absolute left-1 right-1 rounded px-2 py-1 border-l-4 cursor-pointer transition-opacity hover:opacity-80 ${categoryColor} ${isInactive ? "opacity-50" : ""}`}
                  style={{ top: `${top}px`, minHeight: `${height}px` }}
                >
                  <div className={`text-white text-sm font-medium ${isInactive ? "line-through" : ""}`}>
                    {event.event_time.slice(0, 5)}
                  </div>
                  <div className={`text-white text-sm font-semibold ${isInactive ? "line-through" : ""}`}>
                    {event.title}
                  </div>
                  {event.description && (
                    <div className="text-white/80 text-xs truncate">{event.description}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
