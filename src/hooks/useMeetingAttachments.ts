import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useCallback } from "react";

export interface MeetingAttachment {
  id: string;
  minute_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
}

// Cache for signed URLs to avoid repeated requests
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

export function useMeetingAttachments(minuteId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const attachmentsQuery = useQuery({
    queryKey: ["meeting-attachments", minuteId],
    queryFn: async () => {
      if (!minuteId) return [];
      
      const { data, error } = await supabase
        .from("meeting_minute_attachments")
        .select("*")
        .eq("minute_id", minuteId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as MeetingAttachment[];
    },
    enabled: !!minuteId && !!user,
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ file, minuteId }: { file: File; minuteId: string }) => {
      if (!user) throw new Error("Not authenticated");

      // Upload file to storage
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${minuteId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("meeting-attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { error: insertError } = await supabase
        .from("meeting_minute_attachments")
        .insert({
          minute_id: minuteId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        });

      if (insertError) {
        // Cleanup uploaded file on failure
        await supabase.storage.from("meeting-attachments").remove([filePath]);
        throw insertError;
      }

      return filePath;
    },
    onSuccess: () => {
      toast.success("File uploaded successfully");
      queryClient.invalidateQueries({ queryKey: ["meeting-attachments", minuteId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to upload file");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachment: MeetingAttachment) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from("meeting-attachments")
        .remove([attachment.file_path]);

      if (storageError) throw storageError;

      // Delete record
      const { error: deleteError } = await supabase
        .from("meeting_minute_attachments")
        .delete()
        .eq("id", attachment.id);

      if (deleteError) throw deleteError;

      // Clear from cache
      signedUrlCache.delete(attachment.file_path);
    },
    onSuccess: () => {
      toast.success("Attachment deleted");
      queryClient.invalidateQueries({ queryKey: ["meeting-attachments", minuteId] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete attachment");
    },
  });

  // Get signed URL for private bucket access
  const getSignedUrl = useCallback(async (filePath: string): Promise<string> => {
    // Check cache first
    const cached = signedUrlCache.get(filePath);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    // Request new signed URL from edge function
    const { data, error } = await supabase.functions.invoke('get-signed-url', {
      body: { 
        filePath, 
        bucket: 'meeting-attachments',
        expiresIn: 3600 // 1 hour
      },
    });

    if (error) {
      console.error('Error getting signed URL:', error);
      throw new Error('Failed to get file access');
    }

    // Cache the URL with expiry (subtract 5 minutes for safety margin)
    const expiresAt = Date.now() + (3600 - 300) * 1000;
    signedUrlCache.set(filePath, { url: data.signedUrl, expiresAt });

    return data.signedUrl;
  }, []);

  return {
    attachments: attachmentsQuery.data || [],
    isLoading: attachmentsQuery.isLoading,
    uploadFile: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    deleteAttachment: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    getSignedUrl,
  };
}