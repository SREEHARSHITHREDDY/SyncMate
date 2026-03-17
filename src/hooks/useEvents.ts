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
  end_time: string | null;       // NEW: optional end time
  color: string | null;          // NEW: optional custom hex color
  priority: "low" | "medium" | "high";
  recurrence_type: string | null;
  recurrence_end_date: string | null;
  created_at: string;
  is_completed: boolean;
  category: string | null;
}

export interface EventWithResponse extends Event {
  response?: "pending" | "yes" | "no" | "maybe";
  isCreator: boolean;
}

export function useEvents() {
  const { user } = useAuth();

  const eventsQuery = useQuery({
    queryKey: ["events", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const today = new Date().toISOString().split("T")[0];

      // Get ALL events created by user (no date filter — calendar needs past events too)
      const { data: createdEvents, error: createdError } = await supabase
        .from("events")
        .select("*")
        .eq("creator_id", user.id)
        .order("event_date", { ascending: true });

      if (createdError) throw createdError;

      // Get event invitations
      const { data: responses, error: responsesError } = await supabase
        .from("event_responses")
        .select("*, events(*)")
        .eq("user_id", user.id);

      if (responsesError) throw responsesError;

      const invitedEvents = (responses || [])
        .filter((r) => r.events != null)
        .map((r) => ({
          ...(r.events as unknown as Event),
          response: r.response as EventWithResponse["response"],
          isCreator: false,
        })) as EventWithResponse[];

      const createdWithFlag = (createdEvents || []).map((e) => ({
        ...(e as unknown as Event),
        isCreator: true,
        response: "yes" as const,
      })) as EventWithResponse[];

      // Combine and deduplicate
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
    staleTime: 1000 * 60 * 2,
  });

  // Upcoming events only (today onwards) — for dashboard and invites
  const today = new Date().toISOString().split("T")[0];
  const upcomingEvents = (eventsQuery.data || []).filter(
    e => e.event_date >= today
  );

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
        .filter((r) => r.events != null)
        .map((r) => ({
          ...(r.events as unknown as Event),
          responseId: r.id,
          response: r.response,
        }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 2,
  });

  return {
    events: eventsQuery.data || [],         // ALL events (past + future) for calendar
    upcomingEvents,                          // future only — for dashboard
    eventsLoading: eventsQuery.isLoading,
    pendingInvites: pendingInvitesQuery.data || [],
    pendingInvitesLoading: pendingInvitesQuery.isLoading,
  };
}