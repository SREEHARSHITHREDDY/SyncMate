import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

export function useEventDragDrop() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const updateEventMutation = useMutation({
    mutationFn: async ({
      eventId,
      newDate,
      newTime,
    }: {
      eventId: string;
      newDate: Date;
      newTime: string;
    }) => {
      const formattedDate = format(newDate, "yyyy-MM-dd");
      
      const { error } = await supabase
        .from("events")
        .update({
          event_date: formattedDate,
          event_time: newTime,
        })
        .eq("id", eventId)
        .eq("creator_id", user?.id);

      if (error) throw error;
      
      return { formattedDate, newTime };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(`Event moved to ${data.formattedDate} at ${data.newTime}`);
    },
    onError: (error) => {
      console.error("Failed to update event:", error);
      toast.error("Failed to move event. You can only move events you created.");
    },
  });

  const handleDragEnd = (
    eventId: string,
    eventCreatorId: string,
    newDate: Date,
    newHour: number
  ) => {
    // Only allow moving events the user created
    if (eventCreatorId !== user?.id) {
      toast.error("You can only move events you created");
      return;
    }

    const newTime = `${newHour.toString().padStart(2, "0")}:00`;
    updateEventMutation.mutate({ eventId, newDate, newTime });
  };

  return {
    handleDragEnd,
    isUpdating: updateEventMutation.isPending,
  };
}
