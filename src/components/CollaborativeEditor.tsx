import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useCollaborativeEditing } from "@/hooks/useCollaborativeEditing";
import { useEventParticipants, EventParticipant, formatMention } from "@/hooks/useEventParticipants";
import { Badge } from "@/components/ui/badge";
import { Users, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: participants = [] } = useEventParticipants(eventId);

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

  // Filter participants based on search
  const filteredParticipants = participants.filter((p) =>
    p.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  // Reset mention index when filtered list changes
  useEffect(() => {
    setMentionIndex(0);
  }, [mentionSearch]);

  const insertMention = useCallback((participant: EventParticipant) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Find the @ symbol position
    const beforeCursor = localValue.slice(0, cursorPosition);
    const atIndex = beforeCursor.lastIndexOf("@");

    if (atIndex === -1) return;

    const beforeAt = localValue.slice(0, atIndex);
    const afterCursor = localValue.slice(cursorPosition);

    const mention = formatMention(participant.name, participant.userId);
    const newValue = beforeAt + mention + " " + afterCursor;

    setLocalValue(newValue);
    onChange(newValue);
    setShowMentions(false);
    setMentionSearch("");

    // Set cursor position after mention
    setTimeout(() => {
      const newPosition = atIndex + mention.length + 1;
      textarea.focus();
      textarea.setSelectionRange(newPosition, newPosition);
    }, 0);

    // Broadcast update
    if (minuteId) {
      broadcastContent(newValue);
    }
  }, [localValue, cursorPosition, onChange, minuteId, broadcastContent]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPosition = e.target.selectionStart || 0;

    setLocalValue(newValue);
    setCursorPosition(newCursorPosition);
    onChange(newValue);
    handleTyping();

    // Check for @ mention trigger
    const beforeCursor = newValue.slice(0, newCursorPosition);
    const lastAtIndex = beforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const afterAt = beforeCursor.slice(lastAtIndex + 1);
      if (!afterAt.includes(" ") && !afterAt.includes("\n")) {
        setShowMentions(true);
        setMentionSearch(afterAt);
      } else {
        setShowMentions(false);
        setMentionSearch("");
      }
    } else {
      setShowMentions(false);
      setMentionSearch("");
    }

    // Debounced broadcast to other editors
    if (minuteId) {
      broadcastContent(newValue);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions || filteredParticipants.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setMentionIndex((prev) =>
          prev < filteredParticipants.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredParticipants.length - 1
        );
        break;
      case "Enter":
      case "Tab":
        e.preventDefault();
        insertMention(filteredParticipants[mentionIndex]);
        break;
      case "Escape":
        setShowMentions(false);
        setMentionSearch("");
        break;
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowMentions(false);
    }, 200);
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
            // FIX: was editor.oderId — now editor.userId
            <Badge key={editor.userId} variant="secondary" className="text-xs px-1.5 py-0">
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

      {/* Editor with mention dropdown */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          className="resize-none"
        />

        {/* Mention dropdown */}
        {showMentions && filteredParticipants.length > 0 && (
          <div className="absolute z-50 w-64 max-h-48 overflow-auto mt-1 bg-popover border rounded-md shadow-lg">
            <div className="p-1">
              <div className="flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground border-b mb-1">
                <AtSign className="h-3 w-3" />
                <span>Mention a participant</span>
              </div>
              {filteredParticipants.map((participant, index) => (
                <button
                  key={participant.userId}
                  type="button"
                  className={cn(
                    "w-full text-left px-2 py-1.5 rounded-sm text-sm flex items-center gap-2",
                    index === mentionIndex
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  )}
                  onClick={() => insertMention(participant)}
                  onMouseEnter={() => setMentionIndex(index)}
                >
                  <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{participant.name}</div>
                    {participant.isCreator && (
                      <span className="text-xs text-muted-foreground">Organizer</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Help text */}
        <p className="text-xs text-muted-foreground mt-1">
          Type @ to mention participants and notify them
        </p>
      </div>
    </div>
  );
}