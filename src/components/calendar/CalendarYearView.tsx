import { useMemo } from "react";
import { format, parseISO, isSameMonth, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, startOfWeek, getDay } from "date-fns";
import { EventWithResponse } from "@/hooks/useEvents";

interface CalendarYearViewProps {
  selectedDate: Date;
  events: (EventWithResponse & { isCancelled?: boolean })[];
  onMonthClick?: (date: Date) => void;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i);
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarYearView({ selectedDate, events, onMonthClick }: CalendarYearViewProps) {
  const year = selectedDate.getFullYear();

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = parseISO(event.event_date);
      return isSameDay(eventDate, day);
    });
  };

  const getMonthDays = (monthIndex: number) => {
    const monthDate = new Date(year, monthIndex, 1);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    return eachDayOfInterval({ start, end });
  };

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-6 p-4">
      {MONTHS.map((monthIndex) => {
        const monthDate = new Date(year, monthIndex, 1);
        const days = getMonthDays(monthIndex);
        const firstDayOfWeek = getDay(days[0]);

        return (
          <div
            key={monthIndex}
            onClick={() => onMonthClick?.(monthDate)}
            className="cursor-pointer hover:bg-secondary/50 rounded-lg p-3 transition-colors"
          >
            <h3 className="text-sm font-semibold mb-2 text-center">
              {format(monthDate, "MMMM")}
            </h3>
            
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {DAYS.map((day, i) => (
                <div key={i} className="text-[10px] text-muted-foreground text-center">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-0.5">
              {/* Empty cells for offset */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}
              
              {days.map((day) => {
                const dayEvents = getEventsForDay(day);
                const today = isToday(day);
                const hasEvents = dayEvents.length > 0;
                const hasHighPriority = dayEvents.some(e => e.priority === "high" && !e.isCancelled && !e.is_completed);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`aspect-square flex items-center justify-center text-[10px] rounded-sm relative ${
                      today ? "bg-primary text-primary-foreground font-bold" : ""
                    }`}
                  >
                    {format(day, "d")}
                    {hasEvents && !today && (
                      <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0.5 rounded-full ${
                        hasHighPriority ? "bg-red-500" : "bg-primary"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
