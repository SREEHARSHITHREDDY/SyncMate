import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
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

export interface CalendarPermissionWithProfile extends CalendarPermission {
  profile?: {
    user_id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
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

      // Get profiles for all owners
      const ownerIds = data.map((p) => p.owner_id);
      if (ownerIds.length === 0) return data as CalendarPermissionWithProfile[];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url")
        .in("user_id", ownerIds);

      if (profilesError) throw profilesError;

      return data.map((permission) => ({
        ...permission,
        profile: profiles?.find((p) => p.user_id === permission.owner_id),
      })) as CalendarPermissionWithProfile[];
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

      // Get profiles for all viewers
      const viewerIds = data.map((p) => p.viewer_id);
      if (viewerIds.length === 0) return data as CalendarPermissionWithProfile[];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, email, avatar_url")
        .in("user_id", viewerIds);

      if (profilesError) throw profilesError;

      return data.map((permission) => ({
        ...permission,
        profile: profiles?.find((p) => p.user_id === permission.viewer_id),
      })) as CalendarPermissionWithProfile[];
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

  // Grant calendar access (accept a request) with optional date restrictions
  const grantAccessMutation = useMutation({
    mutationFn: async (params: { 
      permissionId: string; 
      viewFromDate?: string | null;
      expiresAt?: string | null;
    }) => {
      const { permissionId, viewFromDate, expiresAt } = params;
      const { data, error } = await supabase
        .from("calendar_permissions")
        .update({ 
          status: "accepted",
          view_from_date: viewFromDate || null,
          expires_at: expiresAt || null,
        })
        .eq("id", permissionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-received"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-sent"] });
    },
  });

  // Update permission restrictions
  const updatePermissionMutation = useMutation({
    mutationFn: async (params: { 
      permissionId: string; 
      viewFromDate?: string | null;
      expiresAt?: string | null;
    }) => {
      const { permissionId, viewFromDate, expiresAt } = params;
      const { data, error } = await supabase
        .from("calendar_permissions")
        .update({ 
          view_from_date: viewFromDate,
          expires_at: expiresAt,
        })
        .eq("id", permissionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-received"] });
    },
  });

  // Reject calendar access request
  const rejectAccessMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { data, error } = await supabase
        .from("calendar_permissions")
        .update({ status: "rejected" })
        .eq("id", permissionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-received"] });
    },
  });

  // Revoke calendar access (delete the permission)
  const revokeAccessMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from("calendar_permissions")
        .delete()
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-received"] });
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

  // Get list of calendars the user has access to
  const accessibleCalendars = (sentRequestsQuery.data || []).filter(
    (p) => p.status === "accepted"
  );

  // Get pending requests received by the user
  const pendingReceivedRequests = (receivedRequestsQuery.data || []).filter(
    (p) => p.status === "pending"
  );

  // Get granted access (users who can view my calendar)
  const grantedAccess = (receivedRequestsQuery.data || []).filter(
    (p) => p.status === "accepted"
  );

  return {
    // Sent requests (as viewer)
    sentRequests: sentRequestsQuery.data || [],
    sentRequestsLoading: sentRequestsQuery.isLoading,
    
    // Received requests (as owner)
    receivedRequests: receivedRequestsQuery.data || [],
    receivedRequestsLoading: receivedRequestsQuery.isLoading,
    
    // Filtered lists
    pendingReceivedRequests,
    grantedAccess,
    accessibleCalendars,
    
    // Mutations
    requestAccess: requestAccessMutation.mutateAsync,
    requestingAccess: requestAccessMutation.isPending,
    
    grantAccess: grantAccessMutation.mutateAsync,
    grantingAccess: grantAccessMutation.isPending,
    
    updatePermission: updatePermissionMutation.mutateAsync,
    updatingPermission: updatePermissionMutation.isPending,
    
    rejectAccess: rejectAccessMutation.mutateAsync,
    rejectingAccess: rejectAccessMutation.isPending,
    
    revokeAccess: revokeAccessMutation.mutateAsync,
    revokingAccess: revokeAccessMutation.isPending,
    
    // Helpers
    getRequestStatus,
    hasAccessTo,
  };
}
