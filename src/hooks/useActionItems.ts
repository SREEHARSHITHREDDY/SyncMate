import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";

export interface ActionItem {
  id: string;
  minute_id: string;
  event_id: string;
  content: string;
  assignee_id: string | null;
  is_completed: boolean;
  due_date: string | null;
  reminder_sent: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useActionItems(eventId: string, minuteId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const actionItemsQuery = useQuery({
    queryKey: ["action-items", eventId, minuteId],
    queryFn: async () => {
      let query = supabase
        .from("action_items")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (minuteId) {
        query = query.eq("minute_id", minuteId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ActionItem[];
    },
    enabled: !!eventId && !!user,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!eventId || !user) return;

    const channel = supabase
      .channel(`action-items-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "action_items",
          filter: `event_id=eq.${eventId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["action-items", eventId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, user, queryClient]);

  const createMutation = useMutation({
    mutationFn: async ({
      minuteId,
      content,
      assigneeId,
      dueDate,
    }: {
      minuteId: string;
      content: string;
      assigneeId?: string;
      dueDate?: string;
    }) => {
      const { data, error } = await supabase
        .from("action_items")
        .insert({
          minute_id: minuteId,
          event_id: eventId,
          content,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Create notification for assignee using secure RPC function
      if (assigneeId && assigneeId !== user!.id) {
        await supabase.rpc('create_action_item_notification', {
          p_assignee_id: assigneeId,
          p_event_id: eventId,
          p_action_item_content: content,
          p_due_date: dueDate || null,
        });
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Action item added");
      queryClient.invalidateQueries({ queryKey: ["action-items", eventId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create action item");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      id,
      isCompleted,
    }: {
      id: string;
      isCompleted: boolean;
    }) => {
      const { error } = await supabase
        .from("action_items")
        .update({ is_completed: isCompleted })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-items", eventId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update action item");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      content,
      assigneeId,
      dueDate,
    }: {
      id: string;
      content?: string;
      assigneeId?: string | null;
      dueDate?: string | null;
    }) => {
      const updates: Record<string, any> = {};
      if (content !== undefined) updates.content = content;
      if (assigneeId !== undefined) updates.assignee_id = assigneeId;
      if (dueDate !== undefined) {
        updates.due_date = dueDate;
        // Reset reminder_sent when due date changes
        updates.reminder_sent = false;
      }

      const { error } = await supabase
        .from("action_items")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["action-items", eventId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update action item");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("action_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Action item deleted");
      queryClient.invalidateQueries({ queryKey: ["action-items", eventId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete action item");
    },
  });

  return {
    actionItems: actionItemsQuery.data || [],
    isLoading: actionItemsQuery.isLoading,
    createActionItem: createMutation.mutate,
    isCreating: createMutation.isPending,
    toggleActionItem: toggleMutation.mutate,
    updateActionItem: updateMutation.mutate,
    deleteActionItem: deleteMutation.mutate,
  };
}
