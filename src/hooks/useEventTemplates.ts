import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EventTemplate {
  id: string;
  user_id: string;
  name: string;
  title: string;
  description: string | null;
  default_time: string;
  priority: "low" | "medium" | "high";
  recurrence_type: string | null;
  created_at: string;
  updated_at: string;
}

type NewTemplate = Omit<EventTemplate, "id" | "user_id" | "created_at" | "updated_at">;

export function useEventTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["event-templates", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("event_templates")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EventTemplate[];
    },
    enabled: !!user?.id,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: NewTemplate) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("event_templates")
        .insert({ ...template, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-templates", user?.id] });
      toast.success("Template created!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create template");
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EventTemplate> & { id: string }) => {
      const { error } = await supabase
        .from("event_templates")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-templates", user?.id] });
      toast.success("Template updated!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update template");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("event_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event-templates", user?.id] });
      toast.success("Template deleted!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete template");
    },
  });

  return {
    templates,
    isLoading,
    createTemplate: createTemplate.mutate,
    isCreating: createTemplate.isPending,
    updateTemplate: updateTemplate.mutate,
    isUpdating: updateTemplate.isPending,
    deleteTemplate: deleteTemplate.mutate,
    isDeleting: deleteTemplate.isPending,
  };
}
