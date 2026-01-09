import { useEffect, useCallback } from "react";

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: Shortcut[];
  enabled?: boolean;
}

export function useKeyboardShortcuts({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape key in inputs
        if (event.key !== "Escape") return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatch = shortcut.metaKey ? event.metaKey : !event.metaKey;
        const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;

        // Handle Cmd/Ctrl cross-platform
        const cmdOrCtrl = shortcut.ctrlKey || shortcut.metaKey;
        const hasCmdOrCtrl = event.ctrlKey || event.metaKey;

        if (keyMatch && cmdOrCtrl && hasCmdOrCtrl && shiftMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }

        if (keyMatch && !cmdOrCtrl && ctrlMatch && metaMatch && shiftMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}

// Predefined app shortcuts
export const APP_SHORTCUTS = {
  OPEN_AI_ASSISTANT: { key: "k", ctrlKey: true, description: "Open AI Assistant" },
  OPEN_SHORTCUTS: { key: "/", ctrlKey: true, description: "Show keyboard shortcuts" },
  GO_DASHBOARD: { key: "d", ctrlKey: true, shiftKey: true, description: "Go to Dashboard" },
  GO_CALENDAR: { key: "c", ctrlKey: true, shiftKey: true, description: "Go to Calendar" },
  GO_FRIENDS: { key: "f", ctrlKey: true, shiftKey: true, description: "Go to Friends" },
  CREATE_EVENT: { key: "n", ctrlKey: true, description: "Create new event" },
} as const;
