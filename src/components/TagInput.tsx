import { useState, KeyboardEvent, useRef } from "react";
import { X, Plus, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Predefined tag colors for visual distinction
const TAG_COLORS: Record<string, string> = {
  urgent: "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
  important: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  meeting: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  personal: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  work: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  followup: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  review: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  design: "bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/30",
};

// Default color for tags without predefined colors
const DEFAULT_TAG_COLOR = "bg-secondary text-secondary-foreground border-border";

export function getTagColor(tag: string): string {
  const normalizedTag = tag.toLowerCase().replace(/[^a-z]/g, "");
  return TAG_COLORS[normalizedTag] || DEFAULT_TAG_COLOR;
}

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  className?: string;
}

export function TagInput({ tags, onChange, suggestions = [], placeholder = "Add tag...", className }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAddTag = (tag: string) => {
    const normalizedTag = tag.trim().toLowerCase();
    if (normalizedTag && !tags.includes(normalizedTag)) {
      onChange([...tags, normalizedTag]);
    }
    setInputValue("");
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const filteredSuggestions = suggestions.filter(
    s => !tags.includes(s) && s.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <Badge
            key={tag}
            variant="outline"
            className={cn("gap-1 pr-1", getTagColor(tag))}
          >
            <Tag className="h-3 w-3" />
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="relative">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={placeholder}
            className="h-8"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputValue.trim() && handleAddTag(inputValue)}
            disabled={!inputValue.trim()}
            className="h-8 px-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
            {filteredSuggestions.slice(0, 5).map(suggestion => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleAddTag(suggestion)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <Badge variant="outline" className={cn("text-xs", getTagColor(suggestion))}>
                  {suggestion}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TagBadgeProps {
  tag: string;
  onRemove?: () => void;
  className?: string;
}

export function TagBadge({ tag, onRemove, className }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 text-[10px] px-1.5 py-0", getTagColor(tag), className)}
    >
      <Tag className="h-2.5 w-2.5" />
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </Badge>
  );
}
