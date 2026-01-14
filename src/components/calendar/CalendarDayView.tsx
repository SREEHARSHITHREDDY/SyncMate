import { useMemo } from "react";
import { format, parseISO, isSameDay } from "date-fns";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { EventWithResponse } from "@/hooks/useEvents";
import { getCategoryColor } from "@/lib/eventCategories";
import { DraggableEvent } from "./DraggableEvent";
import { DroppableTimeSlot } from "./DroppableTimeSlot";
import { useEventDragDrop } from "@/hooks/useEventDragDrop";

interface CalendarDayViewProps {
  selectedDate: Date;
  events: (EventWithResponse & { isCancelled?: boolean })[];
  onEventClick?: (event: EventWithResponse) => void;
  onTimeSlotClick?: (date: Date, time: string) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function CalendarDayView({ selectedDate, events, onEventClick, onTimeSlotClick }: CalendarDayViewProps) {
  const { handleDragEnd } = useEventDragDrop();
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
    return { top: hours * 60 + minutes, height: 60 };
  };

  const handleTimeSlotClick = (hour: number) => {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    onTimeSlotClick?.(selectedDate, timeStr);
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
                <DroppableTimeSlot
                  id={`day-${format(selectedDate, "yyyy-MM-dd")}-${hour}`}
                  date={selectedDate}
                  hour={hour}
                  className="flex-1 border-t border-border/50 cursor-pointer hover:bg-primary/5"
                  onClick={() => handleTimeSlotClick(hour)}
                >
                  <div className="opacity-0 group-hover:opacity-100 text-xs text-muted-foreground p-1 transition-opacity">
                    + Add event
                  </div>
                </DroppableTimeSlot>
              </div>
            ))}

            {/* Events */}
            <div className="absolute left-16 right-0 pointer-events-none">
              {timedEvents.map((event) => {
                const { top, height } = getEventPosition(event);
                
                return (
                  <div
                    key={event.id}
                    className="absolute left-1 right-1 pointer-events-auto"
                    style={{ top: `${top}px`, minHeight: `${height}px` }}
                  >
                    <DraggableEvent
                      event={event}
                      onEventClick={onEventClick}
                    />
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
