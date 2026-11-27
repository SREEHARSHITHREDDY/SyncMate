import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Plan = "free" | "pro";

export interface PlanInfo {
  plan: Plan;
  weeklyEventCount: number;
  canCreateSocialEvent: boolean;
  limit: number;
}

const FREE_WEEKLY_LIMIT = 2;

export function usePlan(): PlanInfo & { isLoading: boolean } {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["profile-plan"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();
      return data;
    },
  });

  const { data: weeklyCount, isLoading: countLoading } = useQuery({
    queryKey: ["weekly-event-count"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { data, error } = await supabase.rpc("count_weekly_social_events", {
        p_user_id: user.id,
      });
      if (error) return 0;
      return data as number;
    },
    // Refetch when navigating back to create event
    refetchOnWindowFocus: true,
  });

  const plan = (profile?.plan as Plan) ?? "free";
  const weeklyEventCount = weeklyCount ?? 0;
  const canCreateSocialEvent = plan === "pro" || weeklyEventCount < FREE_WEEKLY_LIMIT;

  return {
    plan,
    weeklyEventCount,
    canCreateSocialEvent,
    limit: FREE_WEEKLY_LIMIT,
    isLoading: profileLoading || countLoading,
  };
}
