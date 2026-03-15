import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface EventParticipant {
  userId: string;
  name: string;
  email: string;
  isCreator: boolean;
}

export function useEventParticipants(eventId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["event-participants", eventId],
    queryFn: async () => {
      const participants: EventParticipant[] = [];

      // Get event details
      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("creator_id")
        .eq("id", eventId)
        .single();

      if (eventError) throw eventError;

      // Get creator's profile
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("user_id, name, email")
        .eq("user_id", event.creator_id)
        .single();

      if (creatorProfile) {
        participants.push({
          userId: creatorProfile.user_id,
          name: creatorProfile.name,
          email: creatorProfile.email,
          isCreator: true,
        });
      }

      // FIX: was .eq("response", "accepted") — that value never exists.
      // Event responses use "yes" / "no" / "maybe" / "pending".
      // This was causing the collaborative editor mention list to always be empty
      // and meeting minutes @mention notifications to never fire.
      const { data: responses } = await supabase
        .from("event_responses")
        .select("user_id")
        .eq("event_id", eventId)
        .eq("response", "yes");

      if (responses) {
        for (const response of responses) {
          // Skip if already added (creator)
          if (participants.some(p => p.userId === response.user_id)) continue;

          const { data: profile } = await supabase
            .from("profiles")
            .select("user_id, name, email")
            .eq("user_id", response.user_id)
            .single();

          if (profile) {
            participants.push({
              userId: profile.user_id,
              name: profile.name,
              email: profile.email,
              isCreator: false,
            });
          }
        }
      }

      return participants;
    },
    enabled: !!eventId && !!user,
    staleTime: 1000 * 60 * 2,
  });
}

// Extract @mentions from content - returns user IDs
export function extractMentions(content: string): string[] {
  const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[2]); // user ID
  }

  return [...new Set(mentions)]; // unique user IDs
}

// Format content with mention syntax for storage
export function formatMention(name: string, userId: string): string {
  return `@[${name}](${userId})`;
}

// Mention regex pattern
export const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;