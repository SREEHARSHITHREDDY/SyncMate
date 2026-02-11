import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAvailability } from "@/hooks/useAvailability";
import { Clock, Star, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface AvailabilityGridProps {
  eventId: string;
  eventDate: string;
  isCreator: boolean;
  onSelectBestSlot?: (date: string, start: string, end: string) => void;
}

export function AvailabilityGrid({ eventId, eventDate, isCreator, onSelectBestSlot }: AvailabilityGridProps) {
  const { mySlots, summaries, totalParticipants, isLoading, addSlot, removeSlot } = useAvailability(eventId);
  const [slotDate, setSlotDate] = useState(eventDate);
  const [slotStart, setSlotStart] = useState("09:00");
  const [slotEnd, setSlotEnd] = useState("10:00");

  const handleAddSlot = () => {
    if (!slotStart || !slotEnd) {
      toast.error("Please set start and end time");
      return;
    }
    if (slotStart >= slotEnd) {
      toast.error("End time must be after start time");
      return;
    }
    addSlot.mutate({ slot_date: slotDate, slot_start: slotStart, slot_end: slotEnd });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          Availability Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add availability slot */}
        <div className="p-3 rounded-lg border bg-secondary/30 space-y-3">
          <Label className="text-sm font-medium">Add your availability</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Start</Label>
              <Input
                type="time"
                value={slotStart}
                onChange={(e) => setSlotStart(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">End</Label>
              <Input
                type="time"
                value={slotEnd}
                onChange={(e) => setSlotEnd(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleAddSlot} disabled={addSlot.isPending} className="w-full gap-1">
            {addSlot.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            Add Slot
          </Button>
        </div>

        {/* My slots */}
        {mySlots.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Your slots</Label>
            {mySlots.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between p-2 rounded border bg-primary/5 text-sm">
                <span>
                  {format(parseISO(slot.slot_date), "MMM d")} · {slot.slot_start.slice(0, 5)} – {slot.slot_end.slice(0, 5)}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => removeSlot.mutate(slot.id)}
                  disabled={removeSlot.isPending}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Shared availability grid */}
        {summaries.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Shared Availability ({totalParticipants} participants)
            </Label>
            {summaries.map((summary, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border transition-all ${
                  summary.isBest
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "bg-secondary/20"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {summary.isBest && (
                      <Badge variant="default" className="text-xs gap-1 bg-primary">
                        <Star className="h-3 w-3" />
                        Best Suggested Time
                      </Badge>
                    )}
                    <span className="text-sm font-medium">
                      {format(parseISO(summary.slot_date), "MMM d")} · {summary.slot_start.slice(0, 5)} – {summary.slot_end.slice(0, 5)}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {summary.count}/{totalParticipants}
                  </span>
                </div>
                <Progress value={summary.percentage} className="h-2" />
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">{summary.percentage}% available</span>
                  {isCreator && summary.isBest && onSelectBestSlot && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => onSelectBestSlot(summary.slot_date, summary.slot_start, summary.slot_end)}
                    >
                      Set as suggested
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {summaries.length === 0 && mySlots.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No availability submitted yet. Add your available time slots above.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
