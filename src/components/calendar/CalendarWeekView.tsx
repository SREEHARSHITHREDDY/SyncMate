import { useMemo } from "react";
import { format, parseISO, isSameDay, startOfWeek, addDays, isToday } from "date-fns";
import { EventWithResponse } from "@/hooks/useEvents";
import { getEventHex, getDurationLabel, getEventHeightPx } from "@/lib/eventCategories";

interface CalendarWeekViewProps {
  selectedDate: Date;
  events: (EventWithResponse & { isCancelled?: boolean })[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: EventWithResponse) => void;
  onTimeSlotClick?: (date: Date, time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarWeekView({ selectedDate, events, onDateClick, onEventClick, onTimeSlotClick }: CalendarWeekViewProps) {
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
    const top = hours * 60 + minutes;
    const height = getEventHeightPx(event.event_time, event.end_time, 20);
    return { top, height };
  };

  const handleTimeSlotClick = (day: Date, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    onTimeSlotClick?.(day, timeStr);
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
              className={`flex-1 text-center py-3 cursor-pointer hover:bg-secondary/50 transition-colors border-r border-border/30 last:border-r-0 ${
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
              <div className="w-16 text-xs text-muted-foreground pr-2 text-right -mt-2 select-none">
                {format(new Date().setHours(hour, 0), "h a")}
              </div>
              <div className="flex-1 flex border-t border-border/50">
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="flex-1 border-r border-border/30 last:border-r-0 cursor-pointer hover:bg-primary/5 transition-colors"
                    onClick={() => handleTimeSlotClick(day, hour)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Event blocks */}
          <div className="absolute left-16 right-0 flex top-0">
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(day);
              return (
                <div key={day.toISOString()} className="flex-1 relative">
                  {dayEvents.map((event) => {
                    const { top, height } = getEventPosition(event);
                    const isInactive = event.isCancelled || event.is_completed;
                    const hex = getEventHex(event.category, event.color);
                    const duration = getDurationLabel(event.event_time, event.end_time);

                    return (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className={`absolute left-0.5 right-0.5 rounded px-1 py-0.5 cursor-pointer transition-all hover:brightness-110 hover:shadow-sm select-none ${isInactive ? "opacity-50" : ""}`}
                        style={{
                          top: `${top}px`,
                          height: `${height}px`,
                          backgroundColor: hex + "dd",
                          borderLeft: `3px solid ${hex}`,
                        }}
                      >
                        <div className={`text-white text-[10px] font-semibold truncate ${isInactive ? "line-through" : ""}`}>
                          {event.title}
                        </div>
                        {/* Show time range if block tall enough */}
                        {height >= 36 && (
                          <div className="text-white/80 text-[9px] truncate">
                            {event.event_time.slice(0, 5)}
                            {event.end_time && ` – ${event.end_time.slice(0, 5)}`}
                          </div>
                        )}
                        {/* Duration badge if tall enough */}
                        {height >= 52 && (
                          <div className="inline-flex items-center mt-0.5 px-1 py-0 rounded bg-white/20 text-white text-[9px] font-medium">
                            {duration}
                          </div>
                        )}
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