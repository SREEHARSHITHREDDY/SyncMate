import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Profile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user?.id,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Pick<Profile, "name" | "avatar_url">>) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Profile updated successfully!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const uploadAvatar = useCallback(
    async (file: File) => {
      if (!user?.id) {
        toast.error("Not authenticated");
        return null;
      }

      setUploading(true);
      try {
        // Validate file
        if (!file.type.startsWith("image/")) {
          throw new Error("Please select an image file");
        }
        if (file.size > 2 * 1024 * 1024) {
          throw new Error("File size must be less than 2MB");
        }

        // Create unique filename
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);

        // Update profile
        await updateProfile.mutateAsync({ avatar_url: urlData.publicUrl });

        return urlData.publicUrl;
      } catch (error: any) {
        toast.error(error.message || "Failed to upload avatar");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [user?.id, updateProfile]
  );

  const removeAvatar = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      // Update profile to remove avatar URL
      await updateProfile.mutateAsync({ avatar_url: null });
    } catch (error: any) {
      toast.error(error.message || "Failed to remove avatar");
    }
  }, [user?.id, updateProfile]);

  return {
    profile,
    isLoading,
    updateProfile: updateProfile.mutate,
    isUpdating: updateProfile.isPending,
    uploadAvatar,
    uploading,
    removeAvatar,
  };
}
