import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { EventWithResponse } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { RecurrenceSelect, RecurrenceType } from "@/components/RecurrenceSelect";
import { CATEGORY_COLORS, CategoryType, COLOR_PALETTE } from "@/lib/eventCategories";

interface EditEventDialogProps {
  event: EventWithResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEventDialog({ event, open, onOpenChange }: EditEventDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [color, setColor] = useState<string | null>(null);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>();
  const [category, setCategory] = useState<CategoryType>("general");

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || "");
      setDate(new Date(event.event_date));
      setTime(event.event_time.slice(0, 5));
      setEndTime(event.end_time ? event.end_time.slice(0, 5) : "");
      setColor(event.color || null);
      setPriority(event.priority);
      const eventData = event as any;
      setRecurrenceType(eventData.recurrence_type || "none");
      setRecurrenceEndDate(
        eventData.recurrence_end_date ? new Date(eventData.recurrence_end_date) : undefined
      );
      setCategory((eventData.category as CategoryType) || "general");
    }
  }, [event]);

  const handleSave = async () => {
    if (!user || !event || !title.trim() || !date || !time) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (endTime && endTime <= time) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          event_date: format(date, "yyyy-MM-dd"),
          event_time: time,
          end_time: endTime || null,
          color: color || null,
          priority,
          category,
          recurrence_type: recurrenceType === "none" ? null : recurrenceType,
          recurrence_end_date: recurrenceEndDate
            ? format(recurrenceEndDate, "yyyy-MM-dd")
            : null,
        })
        .eq("id", event.id)
        .eq("creator_id", user.id);

      if (error) throw error;

      toast.success("Event updated");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !event) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id)
        .eq("creator_id", user.id);

      if (error) throw error;

      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Make changes to your event details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Event Title</Label>
              <Input
                id="edit-title"
                placeholder="Enter event title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Textarea
                id="edit-description"
                placeholder="Add a description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Start + End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-time">Start Time</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end-time">
                  End Time
                  <span className="text-xs text-muted-foreground ml-1">(optional)</span>
                </Label>
                <Input
                  id="edit-end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            {endTime && time && endTime <= time && (
              <p className="text-xs text-destructive -mt-2">
                End time must be after start time
              </p>
            )}

            {/* Category + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as CategoryType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_COLORS).map(([key, { label, hex }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: hex }}
                          />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Low
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-amber-500" />
                        Medium
                      </div>
                    </SelectItem>
                    <SelectItem value="high">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500" />
                        High
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label>Color (optional)</Label>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setColor(null)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 bg-secondary transition-transform flex items-center justify-center",
                    color === null ? "border-primary scale-110" : "border-border"
                  )}
                  title="Auto (from category)"
                >
                  <span className="text-[10px] font-bold text-muted-foreground">A</span>
                </button>
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      color === c.hex ? "border-primary scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Recurrence */}
            <RecurrenceSelect
              recurrenceType={recurrenceType}
              recurrenceEndDate={recurrenceEndDate}
              onRecurrenceTypeChange={setRecurrenceType}
              onRecurrenceEndDateChange={setRecurrenceEndDate}
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {/* Delete button on the left */}
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isSaving || isDeleting}
              className="sm:mr-auto gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Event
            </Button>

            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isDeleting}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{event?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the event and remove it for all invited
              participants. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}