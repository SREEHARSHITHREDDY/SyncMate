import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CalendarPermission {
  id: string;
  owner_id: string;
  viewer_id: string;
  status: "pending" | "accepted" | "rejected";
  view_from_date: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useCalendarPermissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get all permissions where current user is the viewer (requests sent by me)
  const sentRequestsQuery = useQuery({
    queryKey: ["calendar-permissions-sent", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("calendar_permissions")
        .select("*")
        .eq("viewer_id", user.id);

      if (error) throw error;
      return data as CalendarPermission[];
    },
    enabled: !!user,
  });

  // Get all permissions where current user is the owner (requests received by me)
  const receivedRequestsQuery = useQuery({
    queryKey: ["calendar-permissions-received", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("calendar_permissions")
        .select("*")
        .eq("owner_id", user.id);

      if (error) throw error;
      return data as CalendarPermission[];
    },
    enabled: !!user,
  });

  // Request calendar access from a friend
  const requestAccessMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("calendar_permissions")
        .insert({
          owner_id: ownerId,
          viewer_id: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-sent"] });
    },
  });

  // Check if a request exists for a specific owner
  const getRequestStatus = (ownerId: string): "none" | "pending" | "accepted" | "rejected" => {
    const request = sentRequestsQuery.data?.find((r) => r.owner_id === ownerId);
    if (!request) return "none";
    return request.status as "pending" | "accepted" | "rejected";
  };

  // Check if user has access to a specific calendar
  const hasAccessTo = (ownerId: string): boolean => {
    return getRequestStatus(ownerId) === "accepted";
  };

  return {
    sentRequests: sentRequestsQuery.data || [],
    sentRequestsLoading: sentRequestsQuery.isLoading,
    receivedRequests: receivedRequestsQuery.data || [],
    receivedRequestsLoading: receivedRequestsQuery.isLoading,
    requestAccess: requestAccessMutation.mutateAsync,
    requestingAccess: requestAccessMutation.isPending,
    getRequestStatus,
    hasAccessTo,
  };
}
