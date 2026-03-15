import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  priority: "low" | "medium" | "high";
  recurrence_type: string | null;
  recurrence_end_date: string | null;
  created_at: string;
  is_completed: boolean;
  // FIX: category was missing from the interface even though it exists in the
  // database (confirmed in types.ts). Every component was doing (event as any).category
  // as a workaround. Adding it here removes all those unsafe casts.
  category: string | null;
}

export interface EventWithResponse extends Event {
  response?: "pending" | "yes" | "no" | "maybe";
  isCreator: boolean;
}

export function useEvents() {
  const { user } = useAuth();

  // Get events created by user or invited to
  const eventsQuery = useQuery({
    queryKey: ["events", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const today = new Date().toISOString().split("T")[0];

      // Get events created by user (future + today only for dashboard/list views)
      const { data: createdEvents, error: createdError } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", user.id)
        .gte("event_date", today)
        .order("event_date", { ascending: true });

      if (createdError) throw createdError;

      // Get event invitations (joined events)
      const { data: responses, error: responsesError } = await supabase
        .from("event_responses")
        .select("*, events(*)")
        .eq("user_id", user.id);

      if (responsesError) throw responsesError;

      const invitedEvents = responses
        ?.filter((r) => r.events && r.events.event_date >= today)
        .map((r) => ({
          ...r.events,
          response: r.response,
          isCreator: false,
        })) as EventWithResponse[];

      const createdWithFlag = (createdEvents || []).map((e) => ({
        ...e,
        isCreator: true,
        response: "yes" as const,
      })) as EventWithResponse[];

      // Combine and deduplicate (in case user is also in event_responses for their own event)
      const allEvents = [...createdWithFlag];
      for (const invited of (invitedEvents || [])) {
        if (!allEvents.some(e => e.id === invited.id)) {
          allEvents.push(invited);
        }
      }

      allEvents.sort(
        (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );

      return allEvents;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes — avoids refetch on every navigation
  });

  // Get pending event invitations (for the invitations card on dashboard)
  const pendingInvitesQuery = useQuery({
    queryKey: ["event-invites", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("event_responses")
        .select("*, events(*)")
        .eq("user_id", user.id)
        .eq("response", "pending");

      if (error) throw error;

      return (data || [])
        .filter((r) => r.events)
        .map((r) => ({
          ...r.events,
          responseId: r.id,
          response: r.response,
        }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  return {
    events: eventsQuery.data || [],
    eventsLoading: eventsQuery.isLoading,
    pendingInvites: pendingInvitesQuery.data || [],
    pendingInvitesLoading: pendingInvitesQuery.isLoading,
  };
}