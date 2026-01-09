import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Keyboard, Sparkles, Calendar, Users, Plus, LayoutDashboard } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
  icon?: React.ElementType;
}

const shortcuts: ShortcutItem[] = [
  { keys: ["⌘/Ctrl", "K"], description: "Open AI Assistant", icon: Sparkles },
  { keys: ["⌘/Ctrl", "/"], description: "Show keyboard shortcuts", icon: Keyboard },
  { keys: ["⌘/Ctrl", "N"], description: "Create new event", icon: Plus },
  { keys: ["⌘/Ctrl", "⇧", "D"], description: "Go to Dashboard", icon: LayoutDashboard },
  { keys: ["⌘/Ctrl", "⇧", "C"], description: "Go to Calendar", icon: Calendar },
  { keys: ["⌘/Ctrl", "⇧", "F"], description: "Go to Friends", icon: Users },
  { keys: ["Esc"], description: "Close dialogs / AI Assistant" },
];

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsDialog({ open, onOpenChange }: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate faster
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-4">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-3">
                {shortcut.icon && (
                  <shortcut.icon className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">{shortcut.description}</span>
              </div>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-1 text-xs font-medium bg-background border border-border rounded shadow-sm"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-muted-foreground">
          Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs mx-1">⌘/Ctrl</kbd> +{" "}
          <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs mx-1">/</kbd> anytime to open this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
}
