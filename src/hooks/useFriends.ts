import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Friend {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  profile?: Profile;
}

export function useFriends() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get accepted friends
  const friendsQuery = useQuery({
    queryKey: ["friends", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("friends")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) throw error;

      // Get profiles for all friends
      const friendIds = data.map((f) =>
        f.requester_id === user.id ? f.receiver_id : f.requester_id
      );

      if (friendIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", friendIds);

      if (profilesError) throw profilesError;

      return data.map((friend) => ({
        ...friend,
        profile: profiles?.find(
          (p) =>
            p.user_id ===
            (friend.requester_id === user.id
              ? friend.receiver_id
              : friend.requester_id)
        ),
      })) as Friend[];
    },
    enabled: !!user,
  });

  // Get pending friend requests (received)
  const pendingRequestsQuery = useQuery({
    queryKey: ["friend-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("friends")
        .select("*")
        .eq("receiver_id", user.id)
        .eq("status", "pending");

      if (error) throw error;

      if (data.length === 0) return [];

      const requesterIds = data.map((f) => f.requester_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", requesterIds);

      if (profilesError) throw profilesError;

      return data.map((request) => ({
        ...request,
        profile: profiles?.find((p) => p.user_id === request.requester_id),
      })) as Friend[];
    },
    enabled: !!user,
  });

  // Send friend request
  const sendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("friends").insert({
        requester_id: user.id,
        receiver_id: receiverId,
        status: "pending",
      });

      if (error) throw error;
      // Notification is automatically created by database trigger
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });

  // Accept friend request
  const acceptRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase
        .from("friends")
        .update({ status: "accepted" })
        .eq("id", friendId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });

  // Reject friend request
  const rejectRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase
        .from("friends")
        .update({ status: "rejected" })
        .eq("id", friendId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
    },
  });

  // Search users by email using secure RPC function (returns masked emails)
  // Requires exact email match for security - validates email format client-side
  const searchUsers = async (query: string): Promise<Profile[]> => {
    if (!user || !query.trim()) return [];

    // Validate email format before sending to server
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(query.trim())) {
      // Return empty array for invalid email format - user needs to enter complete email
      return [];
    }

    const { data, error } = await supabase
      .rpc("search_profiles_by_email", { search_query: query.trim().toLowerCase() });

    if (error) throw error;
    
    // Map the RPC response to Profile format (with masked email)
    return (data || []).map((item: { user_id: string; name: string; email_hint: string }) => ({
      id: item.user_id,
      user_id: item.user_id,
      name: item.name,
      email: item.email_hint, // This is the masked email (e.g., "jo***@example.com")
      avatar_url: null,
      created_at: "",
    }));
  };

  return {
    friends: friendsQuery.data || [],
    friendsLoading: friendsQuery.isLoading,
    pendingRequests: pendingRequestsQuery.data || [],
    pendingRequestsLoading: pendingRequestsQuery.isLoading,
    sendRequest: sendRequestMutation.mutateAsync,
    sendingRequest: sendRequestMutation.isPending,
    acceptRequest: acceptRequestMutation.mutateAsync,
    acceptingRequest: acceptRequestMutation.isPending,
    rejectRequest: rejectRequestMutation.mutateAsync,
    rejectingRequest: rejectRequestMutation.isPending,
    searchUsers,
  };
}
