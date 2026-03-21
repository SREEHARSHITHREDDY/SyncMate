import { useState } from "react";
import { useSwipeable } from "react-swipeable";
import { Check, X } from "lucide-react";
import { EventCard } from "./EventCard";
import { EventWithResponse } from "@/hooks/useEvents";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface SwipeableEventCardProps {
  event: EventWithResponse;
  onEdit?: (event: EventWithResponse) => void;
  onCancelOccurrence?: (event: EventWithResponse) => void;
}

export function SwipeableEventCard({ event, onEdit, onCancelOccurrence }: SwipeableEventCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const isCompleted = (event as any).is_completed || false;
  const swipeThreshold = 80;

  const handleSwipeComplete = async () => {
    if (!user || !event.isCreator) return;

    setIsAnimating(true);
    
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_completed: !isCompleted })
        .eq("id", event.id)
        .eq("creator_id", user.id);

      if (error) throw error;

      toast.success(isCompleted ? "Event marked as incomplete" : "Event marked as completed");
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    } finally {
      setSwipeOffset(0);
      setIsAnimating(false);
    }
  };

  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (!event.isCreator) return;
      // Only allow right swipe (positive deltaX)
      if (e.deltaX > 0) {
        setSwipeOffset(Math.min(e.deltaX, 120));
      }
    },
    onSwipedRight: (e) => {
      if (!event.isCreator) return;
      if (e.deltaX > swipeThreshold) {
        handleSwipeComplete();
      } else {
        setSwipeOffset(0);
      }
    },
    onTouchEndOrOnMouseUp: () => {
      if (swipeOffset < swipeThreshold) {
        setSwipeOffset(0);
      }
    },
    trackMouse: false,
    trackTouch: true,
    preventScrollOnSwipe: true,
  });

  const swipeProgress = Math.min(swipeOffset / swipeThreshold, 1);
  const showAction = swipeOffset > 20;

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background action indicator */}
      <div
        className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 transition-colors ${
          swipeProgress >= 1 
            ? isCompleted 
              ? "bg-warning" 
              : "bg-primary"
            : "bg-primary/20"
        }`}
        style={{ width: Math.max(swipeOffset, 0) }}
      >
        {showAction && (
          <div className="flex items-center gap-2 text-primary-foreground">
            {isCompleted ? (
              <>
                <X className="h-5 w-5" />
                <span className="text-sm font-medium whitespace-nowrap">Undo</span>
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                <span className="text-sm font-medium whitespace-nowrap">Done</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Swipeable card */}
      <div
        {...handlers}
        className={`relative bg-background transition-transform ${isAnimating ? "duration-300" : "duration-0"}`}
        style={{ 
          transform: `translateX(${swipeOffset}px)`,
          touchAction: "pan-y"
        }}
      >
        <EventCard
          event={event}
          onEdit={onEdit}
          onCancelOccurrence={onCancelOccurrence}
        />
      </div>

      {/* Swipe hint for mobile (only show on first few cards if creator) */}
      {event.isCreator && swipeOffset === 0 && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/50 pointer-events-none md:hidden">
          ← swipe
        </div>
      )}
    </div>
  );
}
