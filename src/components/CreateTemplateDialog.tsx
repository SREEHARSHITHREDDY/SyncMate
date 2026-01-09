import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { EventTemplate } from "@/hooks/useEventTemplates";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (template: Omit<EventTemplate, "id" | "user_id" | "created_at" | "updated_at">) => void;
  isLoading?: boolean;
  editTemplate?: EventTemplate | null;
}

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
  editTemplate,
}: CreateTemplateDialogProps) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [defaultTime, setDefaultTime] = useState("09:00");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [recurrenceType, setRecurrenceType] = useState<string | null>(null);

  useEffect(() => {
    if (editTemplate) {
      setName(editTemplate.name);
      setTitle(editTemplate.title);
      setDescription(editTemplate.description || "");
      setDefaultTime(editTemplate.default_time.slice(0, 5));
      setPriority(editTemplate.priority);
      setRecurrenceType(editTemplate.recurrence_type);
    } else {
      setName("");
      setTitle("");
      setDescription("");
      setDefaultTime("09:00");
      setPriority("medium");
      setRecurrenceType(null);
    }
  }, [editTemplate, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !title.trim()) return;

    onSubmit({
      name: name.trim(),
      title: title.trim(),
      description: description.trim() || null,
      default_time: defaultTime,
      priority,
      recurrence_type: recurrenceType,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
          <DialogDescription>
            {editTemplate
              ? "Update your event template"
              : "Create a reusable template for quick event creation"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Weekly Team Meeting"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Event Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team Sync"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event details..."
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="time">Default Time</Label>
              <Input
                id="time"
                type="time"
                value={defaultTime}
                onChange={(e) => setDefaultTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="recurrence">Recurrence (Optional)</Label>
            <Select
              value={recurrenceType || "none"}
              onValueChange={(v) => setRecurrenceType(v === "none" ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="No recurrence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No recurrence</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim() || !title.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editTemplate ? (
                "Update Template"
              ) : (
                "Create Template"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
