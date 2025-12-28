import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  remind_1_hour: boolean;
  remind_1_day: boolean;
  email_enabled: boolean;
}

export function useNotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const preferencesQuery = useQuery({
    queryKey: ["notification-preferences", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as NotificationPreferences | null;
    },
    enabled: !!user,
  });

  const upsertMutation = useMutation({
    mutationFn: async (preferences: Partial<NotificationPreferences>) => {
      if (!user) throw new Error("Not authenticated");

      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("notification_preferences")
          .update(preferences)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("notification_preferences")
          .insert({
            user_id: user.id,
            remind_1_hour: preferences.remind_1_hour ?? true,
            remind_1_day: preferences.remind_1_day ?? true,
            email_enabled: preferences.email_enabled ?? true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });

  return {
    preferences: preferencesQuery.data,
    preferencesLoading: preferencesQuery.isLoading,
    updatePreferences: upsertMutation.mutateAsync,
    isUpdating: upsertMutation.isPending,
  };
}
