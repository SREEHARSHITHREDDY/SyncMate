import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EventException {
  id: string;
  event_id: string;
  exception_date: string;
  created_at: string;
}

export function useEventExceptions(eventId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const exceptionsQuery = useQuery({
    queryKey: ["event-exceptions", eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from("event_exceptions")
        .select("*")
        .eq("event_id", eventId)
        .order("exception_date", { ascending: true });

      if (error) throw error;
      return data as EventException[];
    },
    enabled: !!eventId && !!user,
  });

  const addExceptionMutation = useMutation({
    mutationFn: async ({ eventId, date }: { eventId: string; date: string }) => {
      const { error } = await supabase
        .from("event_exceptions")
        .insert({
          event_id: eventId,
          exception_date: date,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Occurrence cancelled");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to cancel occurrence");
    },
  });

  const removeExceptionMutation = useMutation({
    mutationFn: async (exceptionId: string) => {
      const { error } = await supabase
        .from("event_exceptions")
        .delete()
        .eq("id", exceptionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-exceptions"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Occurrence restored");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to restore occurrence");
    },
  });

  return {
    exceptions: exceptionsQuery.data || [],
    exceptionsLoading: exceptionsQuery.isLoading,
    addException: addExceptionMutation.mutateAsync,
    removeException: removeExceptionMutation.mutateAsync,
    isAdding: addExceptionMutation.isPending,
    isRemoving: removeExceptionMutation.isPending,
  };
}
