import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

// FIX: was "oderId" (typo) throughout — renamed to "userId"
interface PresenceState {
  userId: string;
  userName: string;
  isTyping: boolean;
  lastTyped: string;
}

interface CollaborativeEditingOptions {
  minuteId: string | null;
  eventId: string;
  onContentUpdate?: (content: string) => void;
}

export function useCollaborativeEditing({
  minuteId,
  eventId,
  onContentUpdate,
}: CollaborativeEditingOptions) {
  const { user } = useAuth();
  const [activeEditors, setActiveEditors] = useState<PresenceState[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to presence and broadcast channels
  useEffect(() => {
    if (!minuteId || !user) return;

    const channelName = `meeting-minutes-${eventId}-${minuteId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: user.id },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const editors: PresenceState[] = [];

        Object.entries(state).forEach(([key, presences]) => {
          if (key !== user.id && Array.isArray(presences)) {
            presences.forEach((presence: any) => {
              editors.push({
                userId: key,           // FIX: was oderId
                userName: presence.userName || "Someone",
                isTyping: presence.isTyping || false,
                lastTyped: presence.lastTyped || "",
              });
            });
          }
        });

        setActiveEditors(editors);
      })
      .on("broadcast", { event: "content-update" }, ({ payload }) => {
        if (payload.userId !== user.id && onContentUpdate) {
          onContentUpdate(payload.content);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: user.id,           // FIX: was oderId
            userName: user.email?.split("@")[0] || "User",
            isTyping: false,
            lastTyped: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [minuteId, eventId, user, onContentUpdate]);

  // Broadcast content changes
  const broadcastContent = useCallback(
    (content: string) => {
      if (!channelRef.current || !user) return;

      channelRef.current.send({
        type: "broadcast",
        event: "content-update",
        payload: {
          userId: user.id,
          content,
          timestamp: new Date().toISOString(),
        },
      });
    },
    [user]
  );

  // Update typing status
  const setTypingStatus = useCallback(
    async (typing: boolean) => {
      if (!channelRef.current || !user) return;

      setIsTyping(typing);

      await channelRef.current.track({
        userId: user.id,               // FIX: was oderId
        userName: user.email?.split("@")[0] || "User",
        isTyping: typing,
        lastTyped: new Date().toISOString(),
      });
    },
    [user]
  );

  // Handle typing indicator with debounce
  const handleTyping = useCallback(() => {
    setTypingStatus(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(false);
    }, 2000);
  }, [setTypingStatus]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    activeEditors,
    isTyping,
    broadcastContent,
    handleTyping,
  };
}