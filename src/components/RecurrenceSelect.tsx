import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Repeat } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type RecurrenceType = "none" | "daily" | "weekly" | "monthly";

interface RecurrenceSelectProps {
  recurrenceType: RecurrenceType;
  recurrenceEndDate: Date | undefined;
  onRecurrenceTypeChange: (type: RecurrenceType) => void;
  onRecurrenceEndDateChange: (date: Date | undefined) => void;
}

export function RecurrenceSelect({
  recurrenceType,
  recurrenceEndDate,
  onRecurrenceTypeChange,
  onRecurrenceEndDateChange,
}: RecurrenceSelectProps) {
  const recurrenceOptions: { value: RecurrenceType; label: string }[] = [
    { value: "none", label: "No repeat" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-muted-foreground" />
          Repeat
        </Label>
        <div className="flex flex-wrap gap-2">
          {recurrenceOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "capitalize",
                recurrenceType === option.value && "border-primary bg-primary/5 text-primary"
              )}
              onClick={() => onRecurrenceTypeChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {recurrenceType !== "none" && (
        <div className="space-y-2">
          <Label>Repeat until (optional)</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !recurrenceEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {recurrenceEndDate ? format(recurrenceEndDate, "PPP") : "No end date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={recurrenceEndDate}
                onSelect={onRecurrenceEndDateChange}
                disabled={(d) => d < new Date()}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
