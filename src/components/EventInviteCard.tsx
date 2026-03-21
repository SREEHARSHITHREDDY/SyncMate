import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Check, X, HelpCircle, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface EventInviteCardProps {
  event: {
    id: string;
    title: string;
    description: string | null;
    event_date: string;
    event_time: string;
    priority: string;
    responseId?: string;
  };
}

export function EventInviteCard({ event }: EventInviteCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isResponding, setIsResponding] = useState<string | null>(null);

  const handleResponse = async (response: "yes" | "no" | "maybe") => {
    if (!user) return;

    setIsResponding(response);

    try {
      const { error } = await supabase
        .from("event_responses")
        .update({ response })
        .eq("event_id", event.id)
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success(
        response === "yes"
          ? "You're in!"
          : response === "no"
          ? "Event declined"
          : "Marked as maybe"
      );

      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-invites"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to respond");
    } finally {
      setIsResponding(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-priority-low";
      case "high":
        return "bg-priority-high";
      default:
        return "bg-priority-medium";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`h-2 w-2 rounded-full mt-2 ${getPriorityColor(event.priority)}`} />
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate">{event.title}</h4>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(event.event_date), "MMM d")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {event.event_time.slice(0, 5)}
                </span>
              </div>
              {event.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            className="flex-1 gap-1"
            onClick={() => handleResponse("yes")}
            disabled={isResponding !== null}
          >
            {isResponding === "yes" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Check className="h-3 w-3" />
            )}
            Yes
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="flex-1 gap-1"
            onClick={() => handleResponse("maybe")}
            disabled={isResponding !== null}
          >
            {isResponding === "maybe" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <HelpCircle className="h-3 w-3" />
            )}
            Maybe
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1"
            onClick={() => handleResponse("no")}
            disabled={isResponding !== null}
          >
            {isResponding === "no" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
            No
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}