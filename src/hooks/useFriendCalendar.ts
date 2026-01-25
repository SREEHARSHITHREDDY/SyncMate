import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EventWithResponse } from "./useEvents";

export function useFriendCalendar(friendId: string | null) {
  const { user } = useAuth();

  // Fetch friend's events when user has access to their calendar
  const friendEventsQuery = useQuery({
    queryKey: ["friend-calendar", friendId, user?.id],
    queryFn: async () => {
      if (!user || !friendId) return [];

      // First verify we have access using the can_view_calendar function
      const { data: hasAccess, error: accessError } = await supabase
        .rpc("can_view_calendar", { target_user_id: friendId });

      if (accessError) throw accessError;
      if (!hasAccess) {
        throw new Error("You don't have access to this calendar");
      }

      const today = new Date().toISOString().split("T")[0];

      // Fetch friend's events - RLS will filter appropriately
      const { data: events, error } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", friendId)
        .gte("event_date", today)
        .order("event_date", { ascending: true });

      if (error) throw error;

      // Map to EventWithResponse format (user is not creator of these events)
      return (events || []).map((e) => ({
        ...e,
        isCreator: false,
        response: undefined,
      })) as EventWithResponse[];
    },
    enabled: !!user && !!friendId,
  });

  // Fetch friend's event exceptions
  const friendExceptionsQuery = useQuery({
    queryKey: ["friend-calendar-exceptions", friendId, user?.id],
    queryFn: async () => {
      if (!user || !friendId) return [];

      const events = friendEventsQuery.data || [];
      const eventIds = events.map(e => e.id);
      
      if (eventIds.length === 0) return [];

      const { data, error } = await supabase
        .from("event_exceptions")
        .select("*")
        .in("event_id", eventIds);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!friendId && (friendEventsQuery.data?.length || 0) > 0,
  });

  return {
    events: friendEventsQuery.data || [],
    eventsLoading: friendEventsQuery.isLoading,
    eventsError: friendEventsQuery.error,
    exceptions: friendExceptionsQuery.data || [],
    exceptionsLoading: friendExceptionsQuery.isLoading,
  };
}
