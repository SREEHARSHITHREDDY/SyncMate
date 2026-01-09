import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AIEventAssistant } from "./AIEventAssistant";
import { cn } from "@/lib/utils";

export function AIAssistantButton() {
  const [open, setOpen] = useState(false);

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
      >
        <Sparkles className="h-6 w-6 text-white" />
        <span className="sr-only">AI Assistant</span>
      </Button>

      <AIEventAssistant open={open} onOpenChange={setOpen} />
    </>
  );
}
