import { useMemo } from "react";
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { EventWithResponse } from "@/hooks/useEvents";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CalendarMonthViewProps {
  selectedDate: Date;
  events: (EventWithResponse & { isCancelled?: boolean })[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: EventWithResponse) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarMonthView({ selectedDate, events, onDateClick, onEventClick }: CalendarMonthViewProps) {
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = parseISO(event.event_date);
      return isSameDay(eventDate, day);
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-blue-500";
      case "high":
        return "bg-red-500";
      default:
        return "bg-orange-500";
    }
  };

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  return (
    <div className="flex flex-col h-full">
      {/* Day headers */}
      <div className="flex-shrink-0 grid grid-cols-7 border-b border-border">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-3 border-r border-border/30 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-rows-[repeat(auto-fit,_minmax(0,_1fr))]">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 border-b border-border/30 last:border-b-0">
            {week.map((day) => {
              const dayEvents = getEventsForDay(day);
              const inCurrentMonth = isSameMonth(day, selectedDate);
              const today = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onDateClick?.(day)}
                  className={`min-h-[100px] p-2 border-r border-border/30 last:border-r-0 cursor-pointer transition-colors hover:bg-secondary/50 ${
                    !inCurrentMonth ? "bg-muted/30" : ""
                  } ${today ? "bg-primary/10" : ""}`}
                >
                  <div className={`text-sm font-medium mb-1 ${
                    today ? "text-primary font-bold" : inCurrentMonth ? "" : "text-muted-foreground"
                  }`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((event) => {
                      const isInactive = event.isCancelled || event.is_completed;
                      return (
                        <Tooltip key={event.id}>
                          <TooltipTrigger asChild>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick?.(event);
                              }}
                              className={`text-[11px] px-1.5 py-0.5 rounded text-white truncate cursor-pointer transition-opacity hover:opacity-80 ${getPriorityColor(event.priority)} ${isInactive ? "opacity-50 line-through" : ""}`}
                            >
                              {event.event_time.slice(0, 5)} {event.title}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-xs text-muted-foreground">{event.event_time.slice(0, 5)}</p>
                            {event.isCancelled && <p className="text-xs text-destructive">Cancelled</p>}
                            {event.is_completed && <p className="text-xs text-muted-foreground">Completed</p>}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
