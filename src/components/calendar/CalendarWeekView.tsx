import { useMemo } from "react";
import { format, parseISO, isSameDay, startOfWeek, addDays, isToday } from "date-fns";
import { EventWithResponse } from "@/hooks/useEvents";

interface CalendarWeekViewProps {
  selectedDate: Date;
  events: (EventWithResponse & { isCancelled?: boolean })[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: EventWithResponse) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarWeekView({ selectedDate, events, onDateClick, onEventClick }: CalendarWeekViewProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [selectedDate]);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = parseISO(event.event_date);
      return isSameDay(eventDate, day);
    });
  };

  const getEventPosition = (event: EventWithResponse) => {
    const [hours, minutes] = event.event_time.split(":").map(Number);
    return { top: hours * 60 + minutes, height: 60 };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-blue-500/90";
      case "high":
        return "bg-red-500/90";
      default:
        return "bg-orange-500/90";
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Week header */}
      <div className="flex-shrink-0 border-b border-border">
        <div className="flex">
          <div className="w-16" />
          {weekDays.map((day) => (
            <div
              key={day.toISOString()}
              onClick={() => onDateClick?.(day)}
              className={`flex-1 text-center py-3 cursor-pointer hover:bg-secondary/50 transition-colors ${
                isToday(day) ? "bg-primary/10" : ""
              }`}
            >
              <div className="text-xs text-muted-foreground">{format(day, "EEE")}</div>
              <div className={`text-lg font-semibold ${isToday(day) ? "text-primary" : ""}`}>
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative" style={{ minHeight: `${24 * 60}px` }}>
          {/* Hour lines */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex"
              style={{ top: `${hour * 60}px`, height: "60px" }}
            >
              <div className="w-16 text-xs text-muted-foreground pr-2 text-right -mt-2">
                {format(new Date().setHours(hour, 0), "h a")}
              </div>
              <div className="flex-1 flex border-t border-border/50">
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="flex-1 border-r border-border/30 last:border-r-0" />
                ))}
              </div>
            </div>
          ))}

          {/* Events */}
          <div className="absolute left-16 right-0 flex">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div key={day.toISOString()} className="flex-1 relative">
                  {dayEvents.map((event) => {
                    const { top, height } = getEventPosition(event);
                    const isInactive = event.isCancelled || event.is_completed;
                    
                    return (
                      <div
                        key={event.id}
                        onClick={() => onEventClick?.(event)}
                        className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 cursor-pointer transition-opacity hover:opacity-80 ${getPriorityColor(event.priority)} ${isInactive ? "opacity-50" : ""}`}
                        style={{ top: `${top}px`, minHeight: `${Math.max(height, 20)}px` }}
                      >
                        <div className={`text-white text-[10px] font-medium truncate ${isInactive ? "line-through" : ""}`}>
                          {event.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
