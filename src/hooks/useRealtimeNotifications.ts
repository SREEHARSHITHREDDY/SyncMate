import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  // FIX 3: Reuse a single AudioContext for the entire session.
  // Old code created a new AudioContext() on every notification which
  // browsers limit (typically 6 max). After enough notifications the
  // sound stopped working and the browser logged warnings.
  const audioContextRef = useRef<AudioContext | null>(null);

  const playNotificationSound = () => {
    try {
      // Create AudioContext once and reuse it
      if (!audioContextRef.current || audioContextRef.current.state === "closed") {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;

      // Resume if suspended (browsers suspend AudioContext until user interaction)
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);

      // Clean up the oscillator node after it stops (not the context)
      oscillator.onended = () => {
        oscillator.disconnect();
        gainNode.disconnect();
      };
    } catch (error) {
      console.log("Could not play notification sound:", error);
    }
  };

  // Close AudioContext on unmount to free resources
  useEffect(() => {
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as {
            title: string;
            message: string;
            type: string;
          };

          playNotificationSound();

          toast(notification.title, {
            description: notification.message,
            duration: 5000,
          });

          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}