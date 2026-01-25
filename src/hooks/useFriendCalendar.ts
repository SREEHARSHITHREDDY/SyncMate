import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { EventWithResponse } from "./useEvents";

export function useFriendCalendar(friendId: string | null) {
  const { user } = useAuth();

  // Fetch the permission details to get view restrictions
  const permissionQuery = useQuery({
    queryKey: ["friend-calendar-permission", friendId, user?.id],
    queryFn: async () => {
      if (!user || !friendId) return null;

      const { data, error } = await supabase
        .from("calendar_permissions")
        .select("*")
        .eq("owner_id", friendId)
        .eq("viewer_id", user.id)
        .eq("status", "accepted")
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!user && !!friendId,
  });

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

      // Determine the start date for fetching events
      const today = new Date().toISOString().split("T")[0];
      const permission = permissionQuery.data;
      
      // Use view_from_date if it's later than today, otherwise use today
      let startDate = today;
      if (permission?.view_from_date && permission.view_from_date > today) {
        startDate = permission.view_from_date;
      }

      // Fetch friend's events - RLS will filter appropriately
      // Filter out private events since this is a shared calendar view
      const { data: events, error } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", friendId)
        .eq("is_private", false)
        .gte("event_date", startDate)
        .order("event_date", { ascending: true });

      if (error) throw error;

      // Map to EventWithResponse format (user is not creator of these events)
      return (events || []).map((e) => ({
        ...e,
        isCreator: false,
        response: undefined,
      })) as EventWithResponse[];
    },
    enabled: !!user && !!friendId && permissionQuery.isFetched,
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
    eventsLoading: friendEventsQuery.isLoading || permissionQuery.isLoading,
    eventsError: friendEventsQuery.error,
    exceptions: friendExceptionsQuery.data || [],
    exceptionsLoading: friendExceptionsQuery.isLoading,
    permission: permissionQuery.data,
  };
}
