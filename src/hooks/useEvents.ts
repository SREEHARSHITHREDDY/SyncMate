import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface Event {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  end_time: string | null;
  color: string | null;
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
  const { user, loading } = useAuth();

  const eventsQuery = useQuery({
    queryKey: ["events", user?.id],
    queryFn: async () => {
      if (!user) {
        console.log("❌ No user — skipping fetch");
        return [];
      }

      // 🔥 DEBUG: Check actual Supabase session
      const { data: userData } = await supabase.auth.getUser();
      console.log("✅ CURRENT USER:", userData);

      // 🔥 FETCH ALL EVENTS (NO FILTER FIRST)
      const { data: allEventsRaw, error: allError } = await supabase
        .from("events")
        .select("*")
        .order("event_date", { ascending: true });

      console.log("📦 ALL EVENTS FROM DB:", allEventsRaw);
      console.log("❗ ERROR (if any):", allError);

      if (allError) throw allError;

      // 🔥 NOW FILTER MANUALLY (SAFE)
      const createdEvents = (allEventsRaw || []).filter(
        (e) => e.creator_id === user.id
      );

      // 🔥 Fetch invitations
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

      const createdWithFlag = createdEvents.map((e) => ({
        ...(e as unknown as Event),
        isCreator: true,
        response: "yes" as const,
      })) as EventWithResponse[];

      // 🔥 Combine + deduplicate
      const allEvents = [...createdWithFlag];
      for (const invited of invitedEvents) {
        if (!allEvents.some((e) => e.id === invited.id)) {
          allEvents.push(invited);
        }
      }

      allEvents.sort(
        (a, b) =>
          new Date(a.event_date).getTime() -
          new Date(b.event_date).getTime()
      );

      return allEvents;
    },

    // 🔥 CRITICAL FIXES
    enabled: !!user && !loading,   // wait for auth
    staleTime: 0,                 // disable caching temporarily
  });

  // 🔥 Upcoming events (for dashboard)
  const today = new Date().toISOString().split("T")[0];

  const upcomingEvents = (eventsQuery.data || []).filter(
    (e) => e.event_date >= today
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
    enabled: !!user && !loading,
    staleTime: 0,
  });

  return {
    events: eventsQuery.data || [],
    upcomingEvents,
    eventsLoading: eventsQuery.isLoading || loading,
    pendingInvites: pendingInvitesQuery.data || [],
    pendingInvitesLoading: pendingInvitesQuery.isLoading,
  };
}