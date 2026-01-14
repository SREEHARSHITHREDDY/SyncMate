import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "./useFriends";

export interface CalendarPermission {
  id: string;
  owner_id: string;
  viewer_id: string;
  status: "pending" | "accepted" | "rejected";
  view_from_date: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export function useCalendarPermissions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get permissions where I am the viewer (requests I sent)
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

  // Get permissions where I am the owner (requests I received)
  const receivedRequestsQuery = useQuery({
    queryKey: ["calendar-permissions-received", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("calendar_permissions")
        .select("*")
        .eq("owner_id", user.id);

      if (error) throw error;

      if (data.length === 0) return [];

      // Get profiles for viewers
      const viewerIds = data.map((p) => p.viewer_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", viewerIds);

      if (profilesError) throw profilesError;

      return data.map((permission) => ({
        ...permission,
        profile: profiles?.find((p) => p.user_id === permission.viewer_id),
      })) as CalendarPermission[];
    },
    enabled: !!user,
  });

  // Request calendar permission from a friend
  const requestPermissionMutation = useMutation({
    mutationFn: async (ownerId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("calendar_permissions").insert({
        owner_id: ownerId,
        viewer_id: user.id,
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-sent"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-received"] });
    },
  });

  // Accept calendar permission request (as owner)
  const acceptPermissionMutation = useMutation({
    mutationFn: async ({
      permissionId,
      viewFromDate,
      expiresAt,
    }: {
      permissionId: string;
      viewFromDate?: string | null;
      expiresAt?: string | null;
    }) => {
      const { error } = await supabase
        .from("calendar_permissions")
        .update({
          status: "accepted",
          view_from_date: viewFromDate || null,
          expires_at: expiresAt || null,
        })
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-sent"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-received"] });
    },
  });

  // Reject/revoke calendar permission
  const rejectPermissionMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from("calendar_permissions")
        .update({ status: "rejected" })
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-sent"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-received"] });
    },
  });

  // Delete/revoke calendar permission completely
  const deletePermissionMutation = useMutation({
    mutationFn: async (permissionId: string) => {
      const { error } = await supabase
        .from("calendar_permissions")
        .delete()
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-sent"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-received"] });
    },
  });

  // Update permission settings (view_from_date and expires_at)
  const updatePermissionMutation = useMutation({
    mutationFn: async ({
      permissionId,
      viewFromDate,
      expiresAt,
    }: {
      permissionId: string;
      viewFromDate?: string | null;
      expiresAt?: string | null;
    }) => {
      const updateData: Record<string, string | null> = {};
      if (viewFromDate !== undefined) updateData.view_from_date = viewFromDate;
      if (expiresAt !== undefined) updateData.expires_at = expiresAt;

      const { error } = await supabase
        .from("calendar_permissions")
        .update(updateData)
        .eq("id", permissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-sent"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-permissions-received"] });
    },
  });

  // Helper to check if I can view a specific user's calendar
  const canViewCalendar = (ownerId: string): CalendarPermission | undefined => {
    const permissions = sentRequestsQuery.data || [];
    return permissions.find(
      (p) => p.owner_id === ownerId && p.status === "accepted"
    );
  };

  // Helper to get permission status for a friend
  const getPermissionStatus = (friendUserId: string): CalendarPermission | undefined => {
    const permissions = sentRequestsQuery.data || [];
    return permissions.find((p) => p.owner_id === friendUserId);
  };

  // Helper to check if friend has permission to view my calendar
  const getFriendPermission = (friendUserId: string): CalendarPermission | undefined => {
    const permissions = receivedRequestsQuery.data || [];
    return permissions.find((p) => p.viewer_id === friendUserId);
  };

  return {
    sentRequests: sentRequestsQuery.data || [],
    sentRequestsLoading: sentRequestsQuery.isLoading,
    receivedRequests: receivedRequestsQuery.data || [],
    receivedRequestsLoading: receivedRequestsQuery.isLoading,
    pendingReceivedRequests: (receivedRequestsQuery.data || []).filter(
      (p) => p.status === "pending"
    ),
    requestPermission: requestPermissionMutation.mutateAsync,
    requestingPermission: requestPermissionMutation.isPending,
    acceptPermission: acceptPermissionMutation.mutateAsync,
    acceptingPermission: acceptPermissionMutation.isPending,
    rejectPermission: rejectPermissionMutation.mutateAsync,
    rejectingPermission: rejectPermissionMutation.isPending,
    deletePermission: deletePermissionMutation.mutateAsync,
    deletingPermission: deletePermissionMutation.isPending,
    updatePermission: updatePermissionMutation.mutateAsync,
    updatingPermission: updatePermissionMutation.isPending,
    canViewCalendar,
    getPermissionStatus,
    getFriendPermission,
  };
}
