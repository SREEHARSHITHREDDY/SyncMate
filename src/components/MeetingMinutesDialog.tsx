import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMeetingMinutes } from "@/hooks/useMeetingMinutes";
import { Loader2, FileText, Trash2, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface MeetingMinutesDialogProps {
  eventId: string;
  eventTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canEdit: boolean;
}

export function MeetingMinutesDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
  canEdit,
}: MeetingMinutesDialogProps) {
  const { minutes, isLoading, saveMinutes, isSaving, deleteMinutes, isDeleting } =
    useMeetingMinutes(eventId);

  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setContent("");
      setEditingId(null);
      setIsEditing(false);
    }
  }, [open]);

  const handleSave = () => {
    if (!content.trim()) return;
    saveMinutes(
      { content: content.trim(), minuteId: editingId || undefined },
      {
        onSuccess: () => {
          setContent("");
          setEditingId(null);
          setIsEditing(false);
        },
      }
    );
  };

  const handleEdit = (minute: { id: string; content: string }) => {
    setEditingId(minute.id);
    setContent(minute.content);
    setIsEditing(true);
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMinutes(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  const handleCancel = () => {
    setContent("");
    setEditingId(null);
    setIsEditing(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Meeting Minutes
            </DialogTitle>
            <DialogDescription>
              Minutes for "{eventTitle}"
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                {/* New/Edit form */}
                {(isEditing || (canEdit && minutes.length === 0)) && (
                  <div className="space-y-3 mb-4">
                    <Textarea
                      placeholder="Enter meeting minutes, key decisions, action items..."
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      rows={8}
                      className="resize-none"
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSave} disabled={isSaving || !content.trim()}>
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        {editingId ? "Update" : "Save"} Minutes
                      </Button>
                      {(editingId || minutes.length > 0) && (
                        <Button variant="outline" onClick={handleCancel}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Add new button when there are existing minutes */}
                {canEdit && !isEditing && minutes.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full mb-4 gap-2"
                    onClick={() => setIsEditing(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add New Minutes
                  </Button>
                )}

                {/* Existing minutes list */}
                {minutes.length > 0 && !isEditing && (
                  <div className="space-y-4">
                    {minutes.map((minute) => (
                      <div
                        key={minute.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(minute.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                          {canEdit && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={() => handleEdit(minute)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(minute.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="text-sm whitespace-pre-wrap">
                          {minute.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty state for viewers */}
                {!canEdit && minutes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No meeting minutes available yet.</p>
                  </div>
                )}
              </ScrollArea>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Minutes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete these meeting minutes? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
