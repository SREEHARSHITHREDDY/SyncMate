import { useState } from "react";
import { useActionItems, ActionItem } from "@/hooks/useActionItems";
import { useEventParticipants } from "@/hooks/useEventParticipants";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, Trash2, User, ListTodo, CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format, isPast, isToday, isTomorrow, parseISO, differenceInDays } from "date-fns";

interface ActionItemsProps {
  eventId: string;
  minuteId: string;
  canEdit: boolean;
}

export function ActionItems({ eventId, minuteId, canEdit }: ActionItemsProps) {
  const { actionItems, createActionItem, toggleActionItem, updateActionItem, deleteActionItem, isCreating } =
    useActionItems(eventId, minuteId);
  const { data: participants = [] } = useEventParticipants(eventId);

  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newAssignee, setNewAssignee] = useState<string>("");
  const [newDueDate, setNewDueDate] = useState<Date | undefined>(undefined);
  const [dueDateOpen, setDueDateOpen] = useState(false);

  const handleAdd = () => {
    if (!newContent.trim()) return;
    
    createActionItem(
      {
        minuteId,
        content: newContent.trim(),
        assigneeId: newAssignee || undefined,
        dueDate: newDueDate?.toISOString(),
      },
      {
        onSuccess: () => {
          setNewContent("");
          setNewAssignee("");
          setNewDueDate(undefined);
          setIsAdding(false);
        },
      }
    );
  };

  const handleToggle = (item: ActionItem) => {
    toggleActionItem({ id: item.id, isCompleted: !item.is_completed });
  };

  const handleAssigneeChange = (itemId: string, assigneeId: string) => {
    updateActionItem({ id: itemId, assigneeId: assigneeId === "unassigned" ? null : assigneeId });
  };

  const handleDueDateChange = (itemId: string, date: Date | undefined) => {
    updateActionItem({ id: itemId, dueDate: date?.toISOString() || null });
  };

  const getAssigneeName = (assigneeId: string | null): string | null => {
    if (!assigneeId) return null;
    const participant = participants.find((p) => p.userId === assigneeId);
    return participant?.name || null;
  };

  const getDueDateDisplay = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = parseISO(dueDate);
    const isOverdue = isPast(date) && !isToday(date);
    
    let label = format(date, "MMM d");
    if (isToday(date)) {
      label = "Today";
    } else if (isTomorrow(date)) {
      label = "Tomorrow";
    }
    
    const daysUntil = differenceInDays(date, new Date());
    
    return {
      label,
      isOverdue,
      isUrgent: daysUntil <= 1 && daysUntil >= 0,
    };
  };

  if (actionItems.length === 0 && !canEdit) {
    return null;
  }

  return (
    <div className="mt-3 pt-3 border-t">
      <div className="flex items-center gap-2 mb-2">
        <ListTodo className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Action Items
        </span>
      </div>

      <div className="space-y-2">
        {actionItems.map((item) => {
          const dueDateInfo = getDueDateDisplay(item.due_date);
          
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-2 p-2 rounded-md bg-muted/50 group",
                item.is_completed && "opacity-60"
              )}
            >
              <Checkbox
                id={`action-${item.id}`}
                checked={item.is_completed}
                onCheckedChange={() => handleToggle(item)}
                disabled={!canEdit}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`action-${item.id}`}
                  className={cn(
                    "text-sm cursor-pointer block",
                    item.is_completed && "line-through text-muted-foreground"
                  )}
                >
                  {item.content}
                </label>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {item.assignee_id && (
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {getAssigneeName(item.assignee_id)}
                      </span>
                    </div>
                  )}
                  {dueDateInfo && !item.is_completed && (
                    <Badge 
                      variant={dueDateInfo.isOverdue ? "destructive" : dueDateInfo.isUrgent ? "default" : "secondary"}
                      className="text-[10px] px-1.5 py-0 gap-1"
                    >
                      <Clock className="h-2.5 w-2.5" />
                      {dueDateInfo.label}
                    </Badge>
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Due date picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                          "h-6 w-6",
                          item.due_date && "text-primary"
                        )}
                      >
                        <CalendarIcon className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={item.due_date ? parseISO(item.due_date) : undefined}
                        onSelect={(date) => handleDueDateChange(item.id, date)}
                        initialFocus
                      />
                      {item.due_date && (
                        <div className="p-2 border-t">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-destructive hover:text-destructive"
                            onClick={() => handleDueDateChange(item.id, undefined)}
                          >
                            Clear due date
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  {/* Assignee picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <User className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="end">
                      <Select
                        value={item.assignee_id || "unassigned"}
                        onValueChange={(value) => handleAssigneeChange(item.id, value)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Assign to..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {participants.map((p) => (
                            <SelectItem key={p.userId} value={p.userId}>
                              <div className="flex items-center gap-2">
                                {p.name}
                                {p.isCreator && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    Host
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </PopoverContent>
                  </Popover>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => deleteActionItem(item.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* Add new action item */}
        {canEdit && (
          <>
            {isAdding ? (
              <div className="space-y-2 p-2 rounded-md border bg-card">
                <Input
                  placeholder="Action item description..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleAdd();
                    }
                    if (e.key === "Escape") {
                      setIsAdding(false);
                      setNewContent("");
                      setNewAssignee("");
                      setNewDueDate(undefined);
                    }
                  }}
                  autoFocus
                  className="h-8 text-sm"
                />
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={newAssignee} onValueChange={setNewAssignee}>
                    <SelectTrigger className="h-8 flex-1 min-w-[120px] text-xs">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {participants.map((p) => (
                        <SelectItem key={p.userId} value={p.userId}>
                          <div className="flex items-center gap-2">
                            {p.name}
                            {p.isCreator && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                Host
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 text-xs gap-1",
                          newDueDate && "text-primary"
                        )}
                      >
                        <CalendarIcon className="h-3 w-3" />
                        {newDueDate ? format(newDueDate, "MMM d") : "Due date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newDueDate}
                        onSelect={(date) => {
                          setNewDueDate(date);
                          setDueDateOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleAdd}
                    disabled={!newContent.trim() || isCreating}
                  >
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      setIsAdding(false);
                      setNewContent("");
                      setNewAssignee("");
                      setNewDueDate(undefined);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-muted-foreground h-8"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-3 w-3" />
                Add action item
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
