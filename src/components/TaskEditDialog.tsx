import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Save, X, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserActionItem, TaskPriority } from "@/hooks/useUserActionItems";
import { TagInput } from "@/components/TagInput";

interface TaskEditDialogProps {
  item: UserActionItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allTags?: string[];
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: "Low", color: "text-priority-low" },
  medium: { label: "Medium", color: "text-priority-medium" },
  high: { label: "High", color: "text-priority-high" },
};

export function TaskEditDialog({ item, open, onOpenChange, allTags = [] }: TaskEditDialogProps) {
  const [content, setContent] = useState(item?.content || "");
  const [dueDate, setDueDate] = useState<Date | undefined>(
    item?.due_date ? parseISO(item.due_date) : undefined
  );
  const [tags, setTags] = useState<string[]>(item?.tags || []);
  const [priority, setPriority] = useState<TaskPriority>(item?.priority || "medium");
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Reset form when dialog opens with new item
  useEffect(() => {
    if (open && item) {
      setContent(item.content);
      setDueDate(item.due_date ? parseISO(item.due_date) : undefined);
      setTags(item.tags || []);
      setPriority(item.priority || "medium");
    }
  }, [open, item]);

  const handleSave = async () => {
    if (!item || !content.trim()) {
      toast.error("Task content cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("action_items")
        .update({
          content: content.trim(),
          due_date: dueDate ? dueDate.toISOString() : null,
          tags: tags,
          priority: priority,
          reminder_sent: dueDate && item.due_date !== dueDate.toISOString() ? false : item.reminder_sent,
        })
        .eq("id", item.id);

      if (error) throw error;

      toast.success("Task updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["user-action-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update task");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDate = () => {
    setDueDate(undefined);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Make changes to your task. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="content">Task Description</Label>
            <Input
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter task description..."
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>Due Date</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "No due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClearDate}
                  className="h-9 w-9"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
              <SelectTrigger>
                <SelectValue placeholder="Select priority" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <Flag className={cn("h-4 w-4", config.color)} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput
              tags={tags}
              onChange={setTags}
              suggestions={allTags}
              placeholder="Add a tag..."
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Event:</span> {item.event_title}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-1.5">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
