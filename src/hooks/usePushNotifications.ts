import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  registerServiceWorker, 
  subscribeToPush, 
  unsubscribeFromPush,
  requestNotificationPermission,
  isPushSupported
} from "@/lib/pushNotifications";
import { useEffect, useState } from "react";

export function usePushNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(isPushSupported());
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check if user has an active subscription
  const subscriptionQuery = useQuery({
    queryKey: ["push-subscription", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && isSupported,
  });

  const enableMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Request permission
      const perm = await requestNotificationPermission();
      setPermission(perm);
      
      if (perm !== 'granted') {
        throw new Error("Notification permission denied");
      }

      // Register service worker
      await registerServiceWorker();

      // Subscribe to push
      const success = await subscribeToPush(user.id);
      if (!success) {
        throw new Error("Failed to subscribe to push notifications");
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscription"] });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      await unsubscribeFromPush(user.id);
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-subscription"] });
    },
  });

  return {
    isSupported,
    permission,
    isSubscribed: !!subscriptionQuery.data,
    isLoading: subscriptionQuery.isLoading,
    enablePush: enableMutation.mutateAsync,
    disablePush: disableMutation.mutateAsync,
    isEnabling: enableMutation.isPending,
    isDisabling: disableMutation.isPending,
  };
}
