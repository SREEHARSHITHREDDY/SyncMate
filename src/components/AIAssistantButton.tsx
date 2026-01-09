import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AIEventAssistant } from "./AIEventAssistant";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { useKeyboardShortcuts, APP_SHORTCUTS } from "@/hooks/useKeyboardShortcuts";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function AIAssistantButton() {
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const toggleAssistant = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const closeAssistant = useCallback(() => {
    if (open) setOpen(false);
    else if (shortcutsOpen) setShortcutsOpen(false);
  }, [open, shortcutsOpen]);

  // Only enable navigation shortcuts when authenticated
  const isAuthenticated = !!user;

  useKeyboardShortcuts({
    shortcuts: [
      { ...APP_SHORTCUTS.OPEN_AI_ASSISTANT, action: toggleAssistant },
      { ...APP_SHORTCUTS.OPEN_SHORTCUTS, action: () => setShortcutsOpen(true) },
      { key: "Escape", action: closeAssistant, description: "Close" },
      ...(isAuthenticated
        ? [
            { ...APP_SHORTCUTS.GO_DASHBOARD, action: () => navigate("/dashboard") },
            { ...APP_SHORTCUTS.GO_CALENDAR, action: () => navigate("/calendar") },
            { ...APP_SHORTCUTS.GO_FRIENDS, action: () => navigate("/friends") },
            { ...APP_SHORTCUTS.CREATE_EVENT, action: () => navigate("/create-event") },
          ]
        : []),
    ],
  });

  return (
    <>
      <Button
        onClick={() => setOpen(!open)}
        size="icon"
        className={cn(
          "fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-40",
          "bg-gradient-to-br from-primary to-accent hover:opacity-90 transition-all",
          open && "scale-90 opacity-70"
        )}
        title="AI Assistant (⌘K)"
      >
        <Sparkles className="h-6 w-6 text-white" />
        <span className="sr-only">AI Assistant (⌘K)</span>
      </Button>

      {/* Keyboard hint badge */}
      <div className="fixed bottom-4 right-20 z-40 hidden md:flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/80 backdrop-blur-sm text-xs text-muted-foreground">
        <kbd className="px-1.5 py-0.5 rounded bg-background/80 text-[10px] font-medium">⌘K</kbd>
      </div>

      <AIEventAssistant open={open} onOpenChange={setOpen} />
      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}
