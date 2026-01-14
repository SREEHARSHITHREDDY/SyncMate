import { useMemo } from "react";
import { format, parseISO, isSameDay, startOfWeek, addDays, isToday } from "date-fns";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { EventWithResponse } from "@/hooks/useEvents";
import { DraggableEvent } from "./DraggableEvent";
import { DroppableTimeSlot } from "./DroppableTimeSlot";
import { useEventDragDrop } from "@/hooks/useEventDragDrop";

interface CalendarWeekViewProps {
  selectedDate: Date;
  events: (EventWithResponse & { isCancelled?: boolean })[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: EventWithResponse) => void;
  onTimeSlotClick?: (date: Date, time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarWeekView({ selectedDate, events, onDateClick, onEventClick, onTimeSlotClick }: CalendarWeekViewProps) {
  const { handleDragEnd } = useEventDragDrop();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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

  const handleTimeSlotClick = (day: Date, hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    onTimeSlotClick?.(day, timeStr);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const draggedEvent = active.data.current?.event as EventWithResponse;
    const dropData = over.data.current as { date: Date; hour: number };

    if (draggedEvent && dropData) {
      handleDragEnd(draggedEvent.id, draggedEvent.creator_id, dropData.date, dropData.hour);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
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
                <div className="w-16 text-xs text-muted-foreground pr-2 text-right -mt-2">
                  {format(new Date().setHours(hour, 0), "h a")}
                </div>
                <div className="flex-1 flex border-t border-border/50">
                  {weekDays.map((day) => (
                    <DroppableTimeSlot
                      key={day.toISOString()}
                      id={`week-${format(day, "yyyy-MM-dd")}-${hour}`}
                      date={day}
                      hour={hour}
                      className="flex-1 border-r border-border/30 last:border-r-0 cursor-pointer hover:bg-primary/5"
                      onClick={() => handleTimeSlotClick(day, hour)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Events */}
            <div className="absolute left-16 right-0 flex pointer-events-none">
              {weekDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                return (
                  <div key={day.toISOString()} className="flex-1 relative">
                    {dayEvents.map((event) => {
                      const { top, height } = getEventPosition(event);
                      
                      return (
                        <div
                          key={event.id}
                          className="absolute left-0.5 right-0.5 pointer-events-auto"
                          style={{ top: `${top}px`, minHeight: `${Math.max(height, 20)}px` }}
                        >
                          <DraggableEvent
                            event={event}
                            onEventClick={onEventClick}
                            compact
                          />
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
    </DndContext>
  );
}
