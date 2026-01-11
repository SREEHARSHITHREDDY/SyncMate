import React from "react";

interface MentionTextProps {
  content: string;
  className?: string;
}

// Regex to match @[Name](userId) pattern
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

export function MentionText({ content, className }: MentionTextProps) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  // Reset regex state
  MENTION_REGEX.lastIndex = 0;

  while ((match = MENTION_REGEX.exec(content)) !== null) {
    // Add text before this mention
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key}`}>
          {content.slice(lastIndex, match.index)}
        </span>
      );
      key++;
    }
    
    // Add the mention as a styled span
    parts.push(
      <span
        key={`mention-${key}`}
        className="bg-primary/20 text-primary rounded px-1 font-medium"
      >
        @{match[1]}
      </span>
    );
    key++;
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    parts.push(
      <span key={`text-${key}`}>
        {content.slice(lastIndex)}
      </span>
    );
  }

  return (
    <span className={className}>
      {parts.length > 0 ? parts : content}
    </span>
  );
}
