import { useState } from "react";
import { useActionItems, ActionItem } from "@/hooks/useActionItems";
import { useEventParticipants, EventParticipant } from "@/hooks/useEventParticipants";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Trash2, User, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

  const handleAdd = () => {
    if (!newContent.trim()) return;
    
    createActionItem(
      {
        minuteId,
        content: newContent.trim(),
        assigneeId: newAssignee || undefined,
      },
      {
        onSuccess: () => {
          setNewContent("");
          setNewAssignee("");
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

  const getAssigneeName = (assigneeId: string | null): string | null => {
    if (!assigneeId) return null;
    const participant = participants.find((p) => p.userId === assigneeId);
    return participant?.name || null;
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
        {actionItems.map((item) => (
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
              {item.assignee_id && (
                <div className="flex items-center gap-1 mt-1">
                  <User className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {getAssigneeName(item.assignee_id)}
                  </span>
                </div>
              )}
            </div>
            {canEdit && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
        ))}

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
                    }
                  }}
                  autoFocus
                  className="h-8 text-sm"
                />
                <div className="flex items-center gap-2">
                  <Select value={newAssignee} onValueChange={setNewAssignee}>
                    <SelectTrigger className="h-8 flex-1 text-xs">
                      <SelectValue placeholder="Assign to (optional)..." />
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
