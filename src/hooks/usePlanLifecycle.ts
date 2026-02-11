import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type LifecycleStatus = "proposed" | "availability_collected" | "suggested" | "confirmed" | "frozen" | "completed";

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  proposed: "Proposed",
  availability_collected: "Availability Collected",
  suggested: "Suggested",
  confirmed: "Confirmed",
  frozen: "Frozen",
  completed: "Completed",
};

export const LIFECYCLE_ORDER: LifecycleStatus[] = [
  "proposed",
  "availability_collected",
  "suggested",
  "confirmed",
  "frozen",
  "completed",
];

export function usePlanLifecycle(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const updateLifecycle = useMutation({
    mutationFn: async (status: LifecycleStatus) => {
      if (!user) throw new Error("Not authenticated");
      const updateData: Record<string, any> = { lifecycle_status: status };
      if (status === "frozen") {
        updateData.is_frozen = true;
        updateData.frozen_at = new Date().toISOString();
        updateData.frozen_by = user.id;
      }
      if (status === "completed") {
        updateData.is_completed = true;
      }
      const { error } = await supabase
        .from("events")
        .update(updateData)
        .eq("id", eventId)
        .eq("creator_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-detail", eventId] });
      toast.success("Plan status updated");
    },
  });

  const freezePlan = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("events")
        .update({
          is_frozen: true,
          frozen_at: new Date().toISOString(),
          frozen_by: user.id,
          lifecycle_status: "frozen",
        })
        .eq("id", eventId)
        .eq("creator_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-detail", eventId] });
      toast.success("Plan frozen! Changes now require majority approval.");
    },
  });

  const setSuggestedTime = useMutation({
    mutationFn: async (params: { date: string; start: string; end: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("events")
        .update({
          suggested_date: params.date,
          suggested_start_time: params.start,
          suggested_end_time: params.end,
          lifecycle_status: "suggested",
        })
        .eq("id", eventId)
        .eq("creator_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["event-detail", eventId] });
      toast.success("Best time set as suggested!");
    },
  });

  return { updateLifecycle, freezePlan, setSuggestedTime };
}
