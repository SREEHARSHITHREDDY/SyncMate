import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, Loader2, Bell, CheckSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, CategoryType, COLOR_PALETTE } from "@/lib/eventCategories";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: "task" | "reminder";
  initialDate?: Date;
  initialTime?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  defaultType = "task",
  initialDate,
  initialTime,
}: CreateTaskDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const [itemType, setItemType] = useState<"task" | "reminder">(defaultType);
  const [content, setContent] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(initialDate);
  const [reminderTime, setReminderTime] = useState(initialTime || "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [category, setCategory] = useState<CategoryType>("general");
  const [color, setColor] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!user || !content.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (itemType === "reminder" && !dueDate) {
      toast.error("Please select a due date for the reminder");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("action_items").insert({
        assignee_id: user.id,
        created_by: user.id,
        minute_id: null,
        event_id: null,
        content: content.trim(),
        is_completed: false,
        due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
        reminder_time: itemType === "reminder" && reminderTime ? reminderTime : null,
        item_type: itemType,
        priority,
        tags: [category],
        sort_order: 0,
      });

      if (error) throw error;

      toast.success(itemType === "reminder" ? "Reminder created!" : "Task created!");
      queryClient.invalidateQueries({ queryKey: ["user-action-items"] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });

      // Reset form
      setContent("");
      setDueDate(undefined);
      setReminderTime("");
      setPriority("medium");
      setCategory("general");
      setColor(null);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to create");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {itemType === "reminder"
              ? <><Bell className="h-4 w-4 text-primary" /> Create Reminder</>
              : <><CheckSquare className="h-4 w-4 text-primary" /> Create Task</>
            }
          </DialogTitle>
          <DialogDescription>
            {itemType === "reminder"
              ? "A reminder will alert you at the specified time."
              : "A task appears in My Tasks until you mark it complete."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type toggle */}
          <Tabs value={itemType} onValueChange={(v) => setItemType(v as "task" | "reminder")}>
            <TabsList className="w-full">
              <TabsTrigger value="task" className="flex-1 gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" />
                Task
              </TabsTrigger>
              <TabsTrigger value="reminder" className="flex-1 gap-1.5">
                <Bell className="h-3.5 w-3.5" />
                Reminder
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="task-content">
              {itemType === "reminder" ? "What do you want to be reminded about?" : "Task description"} *
            </Label>
            <Input
              id="task-content"
              placeholder={itemType === "reminder" ? "e.g. Submit assignment, Take medicine..." : "e.g. Prepare slides, Call John..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              autoFocus
            />
          </div>

          {/* Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{itemType === "reminder" ? "Reminder date *" : "Due date (optional)"}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "MMM d") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Time — optional for tasks, shown for reminders */}
            <div className="space-y-2">
              <Label htmlFor="task-time">
                {itemType === "reminder" ? "Time (optional)" : "Time (optional)"}
              </Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="task-time"
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="pl-9"
                />
              </div>
              {itemType === "task" && (
                <p className="text-xs text-muted-foreground">Leave blank for no specific time</p>
              )}
            </div>
          </div>

          {/* Priority + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}>
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

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as CategoryType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_COLORS).map(([key, { label, hex }]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: hex }} />
                        {label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Color (optional)</Label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setColor(null)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 bg-gray-200 dark:bg-gray-700 transition-transform",
                  color === null ? "border-primary scale-110" : "border-transparent"
                )}
                title="Auto (from category)"
              />
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={cn(
                    "h-6 w-6 rounded-full border-2 transition-transform",
                    color === c.hex ? "border-primary scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Auto uses your category color</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSaving || !content.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {itemType === "reminder" ? "Create Reminder" : "Create Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}