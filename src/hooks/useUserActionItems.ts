import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export type TaskPriority = "low" | "medium" | "high";
export type TaskRecurrenceType = "daily" | "weekly" | "monthly" | null;

export interface UserActionItem {
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
  tags: string[];
  sort_order: number;
  priority: TaskPriority;
  recurrence_type: TaskRecurrenceType;
  recurrence_end_date: string | null;
  event_title?: string;
}

export function useUserActionItems(includeCompleted = false) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const actionItemsQuery = useQuery({
    queryKey: ["user-action-items", user?.id, includeCompleted],
    queryFn: async () => {
      let query = supabase
        .from("action_items")
        .select("*")
        .eq("assignee_id", user!.id)
        .order("sort_order", { ascending: true });

      if (!includeCompleted) {
        query = query.eq("is_completed", false);
      }

      const { data: actionItems, error } = await query;
      if (error) throw error;

      // FIX: guard against empty array before querying events
      // (previously would send .in("id", []) which is a no-op but wastes a round trip)
      if (actionItems.length === 0) return [];

      const eventIds = [...new Set(actionItems.map((item) => item.event_id))];
      const { data: events } = await supabase
        .from("events")
        .select("id, title")
        .in("id", eventIds);

      const eventMap = new Map(events?.map((e) => [e.id, e.title]) || []);

      return actionItems.map((item) => ({
        ...item,
        tags: item.tags || [],
        sort_order: item.sort_order || 0,
        priority: (item.priority as TaskPriority) || "medium",
        recurrence_type: (item.recurrence_type as TaskRecurrenceType) || null,
        recurrence_end_date: item.recurrence_end_date || null,
        event_title: eventMap.get(item.event_id) || "Unknown Event",
      })) as UserActionItem[];
    },
    enabled: !!user,
    // FIX: was missing staleTime — caused a full refetch every time the user
    // navigated back to MyTasks, which felt like a lag/freeze.
    // 2 minutes is enough; realtime subscription keeps data fresh anyway.
    staleTime: 1000 * 60 * 2,
  });

  // Realtime subscription keeps the cache fresh automatically
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-action-items-${user.id}-${includeCompleted}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "action_items",
          filter: `assignee_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["user-action-items", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, includeCompleted]);

  const items = actionItemsQuery.data || [];
  const incompleteItems = items.filter(item => !item.is_completed);
  const completedItems = items.filter(item => item.is_completed);
  const allTags = [...new Set(items.flatMap(item => item.tags || []))].sort();

  const overdueCount = incompleteItems.filter(
    (item) => item.due_date && new Date(item.due_date) < new Date()
  ).length;

  const dueSoonCount = incompleteItems.filter((item) => {
    if (!item.due_date) return false;
    const dueDate = new Date(item.due_date);
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return dueDate >= now && dueDate <= oneDayFromNow;
  }).length;

  return {
    actionItems: incompleteItems,
    completedItems,
    allItems: items,
    allTags,
    isLoading: actionItemsQuery.isLoading,
    overdueCount,
    dueSoonCount,
    totalCount: incompleteItems.length,
    completedCount: completedItems.length,
  };
}