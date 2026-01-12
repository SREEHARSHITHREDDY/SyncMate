import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isSameDay, getDay, addMonths, subMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CalendarMiniMonthProps {
  selectedDate: Date;
  onDateClick?: (date: Date) => void;
  onMonthChange?: (date: Date) => void;
}

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarMiniMonth({ selectedDate, onDateClick, onMonthChange }: CalendarMiniMonthProps) {
  const days = useMemo(() => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

  const firstDayOfWeek = getDay(days[0]);

  return (
    <div className="w-full">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onMonthChange?.(subMonths(selectedDate, 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{format(selectedDate, "MMMM yyyy")}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onMonthChange?.(addMonths(selectedDate, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((day, i) => (
          <div key={i} className="text-xs text-muted-foreground text-center">
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}
        
        {days.map((day) => {
          const today = isToday(day);
          const selected = isSameDay(day, selectedDate);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateClick?.(day)}
              className={`aspect-square flex items-center justify-center text-xs rounded-full transition-colors hover:bg-secondary ${
                today ? "bg-primary text-primary-foreground font-bold" : ""
              } ${selected && !today ? "ring-1 ring-primary" : ""}`}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>

      {/* Today button */}
      <div className="mt-3 flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateClick?.(new Date())}
        >
          Today
        </Button>
      </div>
    </div>
  );
}
