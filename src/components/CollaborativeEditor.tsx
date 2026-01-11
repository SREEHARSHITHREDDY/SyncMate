import { useState, useEffect, useCallback } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useCollaborativeEditing } from "@/hooks/useCollaborativeEditing";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

interface CollaborativeEditorProps {
  eventId: string;
  minuteId: string | null;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}

export function CollaborativeEditor({
  eventId,
  minuteId,
  value,
  onChange,
  placeholder,
  rows = 8,
  disabled,
}: CollaborativeEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const [lastRemoteUpdate, setLastRemoteUpdate] = useState<number>(0);

  const handleContentUpdate = useCallback((content: string) => {
    setLocalValue(content);
    setLastRemoteUpdate(Date.now());
    onChange(content);
  }, [onChange]);

  const { activeEditors, broadcastContent, handleTyping } = useCollaborativeEditing({
    minuteId,
    eventId,
    onContentUpdate: handleContentUpdate,
  });

  // Sync local value with prop value (for initial load)
  useEffect(() => {
    if (Date.now() - lastRemoteUpdate > 500) {
      setLocalValue(value);
    }
  }, [value, lastRemoteUpdate]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
    handleTyping();
    
    // Debounced broadcast to other editors
    if (minuteId) {
      broadcastContent(newValue);
    }
  };

  const typingEditors = activeEditors.filter((e) => e.isTyping);

  return (
    <div className="space-y-2">
      {/* Active editors indicator */}
      {activeEditors.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>
            {activeEditors.length} other{activeEditors.length > 1 ? "s" : ""} viewing
          </span>
          {activeEditors.map((editor) => (
            <Badge key={editor.oderId} variant="secondary" className="text-xs px-1.5 py-0">
              {editor.userName}
              {editor.isTyping && " (typing...)"}
            </Badge>
          ))}
        </div>
      )}

      {/* Typing indicator */}
      {typingEditors.length > 0 && (
        <div className="text-xs text-muted-foreground animate-pulse">
          {typingEditors.map((e) => e.userName).join(", ")}{" "}
          {typingEditors.length > 1 ? "are" : "is"} typing...
        </div>
      )}

      <Textarea
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="resize-none"
      />
    </div>
  );
}
