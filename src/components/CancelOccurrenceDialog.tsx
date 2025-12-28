import { useState } from "react";
import { format, addDays, addWeeks, addMonths, parseISO, isBefore, isAfter } from "date-fns";
import { CalendarX, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEventExceptions } from "@/hooks/useEventExceptions";
import { EventWithResponse } from "@/hooks/useEvents";

interface CancelOccurrenceDialogProps {
  event: EventWithResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CancelOccurrenceDialog({
  event,
  open,
  onOpenChange,
}: CancelOccurrenceDialogProps) {
  const { exceptions, addException, removeException, isAdding, isRemoving } = useEventExceptions(event?.id);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  if (!event) return null;

  const eventData = event as any;
  const recurrenceType = eventData.recurrence_type;
  const recurrenceEndDate = eventData.recurrence_end_date ? parseISO(eventData.recurrence_end_date) : null;
  const startDate = parseISO(event.event_date);
  const today = new Date();

  // Generate upcoming occurrences
  const generateOccurrences = (): Date[] => {
    if (!recurrenceType) return [startDate];

    const occurrences: Date[] = [];
    let current = startDate;
    const maxOccurrences = 52; // Show up to 1 year of occurrences
    const endDate = recurrenceEndDate || addMonths(today, 12);

    for (let i = 0; i < maxOccurrences; i++) {
      if (isAfter(current, endDate)) break;
      if (!isBefore(current, today)) {
        occurrences.push(current);
      }

      switch (recurrenceType) {
        case "daily":
          current = addDays(current, 1);
          break;
        case "weekly":
          current = addWeeks(current, 1);
          break;
        case "monthly":
          current = addMonths(current, 1);
          break;
        default:
          break;
      }
    }

    return occurrences;
  };

  const occurrences = generateOccurrences();
  const exceptionDates = new Set(exceptions.map((e) => e.exception_date));

  const handleCancelOccurrence = async () => {
    if (!selectedDate || !event) return;
    await addException({
      eventId: event.id,
      date: format(selectedDate, "yyyy-MM-dd"),
    });
    setSelectedDate(undefined);
  };

  const handleRestoreOccurrence = async (exceptionId: string) => {
    await removeException(exceptionId);
  };

  // Disabled dates: not part of the recurrence pattern
  const isOccurrenceDate = (date: Date): boolean => {
    return occurrences.some((o) => format(o, "yyyy-MM-dd") === format(date, "yyyy-MM-dd"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarX className="h-5 w-5" />
            Cancel Occurrence
          </DialogTitle>
          <DialogDescription>
            Cancel a specific occurrence of "{event.title}" without deleting the entire series.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Select a date to cancel:</p>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                return !isOccurrenceDate(date) || exceptionDates.has(dateStr);
              }}
              modifiers={{
                cancelled: Array.from(exceptionDates).map((d) => parseISO(d)),
              }}
              modifiersStyles={{
                cancelled: {
                  textDecoration: "line-through",
                  opacity: 0.5,
                },
              }}
              className="rounded-lg border"
            />
          </div>

          {selectedDate && (
            <Button
              onClick={handleCancelOccurrence}
              disabled={isAdding}
              className="w-full"
              variant="destructive"
            >
              {isAdding && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Cancel {format(selectedDate, "MMMM d, yyyy")}
            </Button>
          )}

          {exceptions.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Cancelled occurrences:</p>
              <ScrollArea className="h-32 rounded-lg border">
                <div className="p-2 space-y-2">
                  {exceptions.map((exception) => (
                    <div
                      key={exception.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-secondary/50"
                    >
                      <span className="text-sm line-through text-muted-foreground">
                        {format(parseISO(exception.exception_date), "MMMM d, yyyy")}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRestoreOccurrence(exception.id)}
                        disabled={isRemoving}
                      >
                        <Undo2 className="h-4 w-4 mr-1" />
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
