import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MeetingMinute {
  id: string;
  event_id: string;
  content: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useMeetingMinutes(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const minutesQuery = useQuery({
    queryKey: ["meeting-minutes", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("meeting_minutes")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as MeetingMinute[];
    },
    enabled: !!eventId && !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ content, minuteId }: { content: string; minuteId?: string }) => {
      if (minuteId) {
        // Update existing
        const { error } = await supabase
          .from("meeting_minutes")
          .update({ content })
          .eq("id", minuteId);
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from("meeting_minutes")
          .insert({
            event_id: eventId,
            content,
            created_by: user!.id,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Meeting minutes saved");
      queryClient.invalidateQueries({ queryKey: ["meeting-minutes", eventId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save meeting minutes");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (minuteId: string) => {
      const { error } = await supabase
        .from("meeting_minutes")
        .delete()
        .eq("id", minuteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meeting minutes deleted");
      queryClient.invalidateQueries({ queryKey: ["meeting-minutes", eventId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete meeting minutes");
    },
  });

  return {
    minutes: minutesQuery.data || [],
    isLoading: minutesQuery.isLoading,
    saveMinutes: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    deleteMinutes: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
