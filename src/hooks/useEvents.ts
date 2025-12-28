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
}

export interface EventWithResponse extends Event {
  response?: "pending" | "yes" | "no" | "maybe";
  isCreator: boolean;
}

export function useEvents() {
  const { user } = useAuth();

  // Get upcoming events (created by user or invited to)
  const eventsQuery = useQuery({
    queryKey: ["events", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const today = new Date().toISOString().split("T")[0];

      // Get events created by user
      const { data: createdEvents, error: createdError } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", user.id)
        .gte("event_date", today)
        .order("event_date", { ascending: true });

      if (createdError) throw createdError;

      // Get event invitations
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

      // Combine and sort
      const allEvents = [...createdWithFlag, ...(invitedEvents || [])];
      allEvents.sort(
        (a, b) =>
          new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
      );

      return allEvents;
    },
    enabled: !!user,
  });

  // Get pending event invitations
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
  });

  return {
    events: eventsQuery.data || [],
    eventsLoading: eventsQuery.isLoading,
    pendingInvites: pendingInvitesQuery.data || [],
    pendingInvitesLoading: pendingInvitesQuery.isLoading,
  };
}
