import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { extractMentions } from "@/hooks/useEventParticipants";

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


  // Create notifications for mentioned users using secure RPC function
  const createMentionNotifications = async (
    content: string,
    previousContent?: string
  ) => {
    const currentMentions = extractMentions(content);
    const previousMentions = previousContent ? extractMentions(previousContent) : [];
    
    // Only notify for new mentions (not already in previous content)
    const newMentions = currentMentions.filter(
      (userId) => !previousMentions.includes(userId) && userId !== user?.id
    );

    if (newMentions.length === 0) return;

    // Use secure RPC function to create notifications
    await supabase.rpc('create_mention_notification', {
      p_event_id: eventId,
      p_mentioned_user_ids: newMentions,
    });
  };

  const saveMutation = useMutation({
    mutationFn: async ({ 
      content, 
      minuteId,
      previousContent 
    }: { 
      content: string; 
      minuteId?: string;
      previousContent?: string;
    }) => {
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

      // Create notifications for @mentions
      await createMentionNotifications(content, previousContent);
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
