import { useMemo } from "react";
import { format, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameMonth, startOfWeek, endOfWeek } from "date-fns";
import { EventWithResponse } from "@/hooks/useEvents";
import { getCategoryColor } from "@/lib/eventCategories";
import { CheckSquare, Bell } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface CalendarTask {
  id: string;
  content: string;
  due_date: string | null;
  is_completed: boolean;
  item_type: string;
  priority: string;
}

interface CalendarMonthViewProps {
  selectedDate: Date;
  events: (EventWithResponse & { isCancelled?: boolean })[];
  tasks?: CalendarTask[];
  onDateClick?: (date: Date) => void;
  onEventClick?: (event: EventWithResponse) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CalendarMonthView({ selectedDate, events, tasks = [], onDateClick, onEventClick }: CalendarMonthViewProps) {
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

  // FIX: get tasks for a specific day based on due_date
  const getTasksForDay = (day: Date) => {
    return tasks.filter((task) => {
      if (!task.due_date || task.is_completed) return false;
      // due_date can be a timestamp or date string
      const taskDate = parseISO(task.due_date);
      return isSameDay(taskDate, day);
    });
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
              const dayTasks = getTasksForDay(day);
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
                    {/* Events */}
                    {dayEvents.slice(0, 3).map((event) => {
                      const isInactive = event.isCancelled || event.is_completed;
                      const categoryColor = getCategoryColor((event as any).category);
                      return (
                        <Tooltip key={event.id}>
                          <TooltipTrigger asChild>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                onEventClick?.(event);
                              }}
                              className={`text-[11px] px-1.5 py-0.5 rounded text-white truncate cursor-pointer transition-opacity hover:opacity-80 ${categoryColor} ${isInactive ? "opacity-50 line-through" : ""}`}
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

                    {/* Tasks — shown as small checkmark/bell indicators */}
                    {dayTasks.slice(0, 2).map((task) => (
                      <Tooltip key={task.id}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-secondary/80 text-muted-foreground truncate">
                            {task.item_type === "reminder" ? (
                              <Bell className="h-2.5 w-2.5 shrink-0 text-amber-500" />
                            ) : (
                              <CheckSquare className="h-2.5 w-2.5 shrink-0 text-blue-500" />
                            )}
                            <span className="truncate">{task.content}</span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="font-medium">{task.item_type === "reminder" ? "Reminder" : "Task"}: {task.content}</p>
                          <p className="text-xs text-muted-foreground capitalize">Priority: {task.priority}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayTasks.length - 2} tasks
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