import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type CommitmentStatus = "confirmed" | "tentative" | "not_available" | "pending";

export interface ParticipantCommitment {
  user_id: string;
  commitment_status: CommitmentStatus;
  profile?: { name: string; avatar_url: string | null } | null;
}

export function useCommitmentStatus(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const commitmentsQuery = useQuery({
    queryKey: ["commitments", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_responses")
        .select("user_id, commitment_status, profiles:user_id(name, avatar_url)")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        user_id: r.user_id,
        commitment_status: (r.commitment_status || "pending") as CommitmentStatus,
        profile: r.profiles,
      })) as ParticipantCommitment[];
    },
    enabled: !!eventId && !!user,
  });

  const updateCommitment = useMutation({
    mutationFn: async (status: CommitmentStatus) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("event_responses")
        .update({ commitment_status: status })
        .eq("event_id", eventId)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commitments", eventId] });
    },
  });

  const commitments = commitmentsQuery.data || [];
  const confirmed = commitments.filter((c) => c.commitment_status === "confirmed").length;
  const tentative = commitments.filter((c) => c.commitment_status === "tentative").length;
  const total = commitments.length;
  const strengthScore = total > 0 ? Math.round(((confirmed + tentative * 0.5) / total) * 100) : 0;

  const myCommitment = commitments.find((c) => c.user_id === user?.id);

  return {
    commitments,
    myCommitment,
    confirmed,
    tentative,
    total,
    strengthScore,
    isLoading: commitmentsQuery.isLoading,
    updateCommitment,
  };
}
