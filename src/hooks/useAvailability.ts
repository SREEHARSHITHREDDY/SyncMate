import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export interface AvailabilitySlot {
  id: string;
  event_id: string;
  user_id: string;
  slot_date: string;
  slot_start: string;
  slot_end: string;
  created_at: string;
}

export interface SlotSummary {
  slot_date: string;
  slot_start: string;
  slot_end: string;
  count: number;
  percentage: number;
  users: string[];
  isBest: boolean;
}

export function useAvailability(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const slotsQuery = useQuery({
    queryKey: ["availability", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("event_id", eventId);
      if (error) throw error;
      return (data || []) as AvailabilitySlot[];
    },
    enabled: !!eventId && !!user,
  });

  const participantsQuery = useQuery({
    queryKey: ["event-participants-count", eventId],
    queryFn: async () => {
      const { data: responses, error } = await supabase
        .from("event_responses")
        .select("user_id")
        .eq("event_id", eventId);
      if (error) throw error;
      // +1 for creator
      return (responses?.length || 0) + 1;
    },
    enabled: !!eventId && !!user,
  });

  const addSlot = useMutation({
    mutationFn: async (slot: { slot_date: string; slot_start: string; slot_end: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("availability_slots").insert({
        event_id: eventId,
        user_id: user.id,
        ...slot,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", eventId] }),
  });

  const removeSlot = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("availability_slots").delete().eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability", eventId] }),
  });

  // Calculate slot summaries with best suggestion
  const totalParticipants = participantsQuery.data || 1;
  const slots = slotsQuery.data || [];

  const slotMap = new Map<string, { count: number; users: string[] }>();
  slots.forEach((s) => {
    const key = `${s.slot_date}|${s.slot_start}|${s.slot_end}`;
    const existing = slotMap.get(key) || { count: 0, users: [] };
    existing.count++;
    existing.users.push(s.user_id);
    slotMap.set(key, existing);
  });

  let maxCount = 0;
  const summaries: SlotSummary[] = [];
  slotMap.forEach((val, key) => {
    const [slot_date, slot_start, slot_end] = key.split("|");
    if (val.count > maxCount) maxCount = val.count;
    summaries.push({
      slot_date,
      slot_start,
      slot_end,
      count: val.count,
      percentage: Math.round((val.count / totalParticipants) * 100),
      users: val.users,
      isBest: false,
    });
  });

  // Mark best slot(s)
  summaries.forEach((s) => {
    if (s.count === maxCount && maxCount > 0) s.isBest = true;
  });

  // Sort by count descending
  summaries.sort((a, b) => b.count - a.count);

  const mySlots = slots.filter((s) => s.user_id === user?.id);

  return {
    slots,
    mySlots,
    summaries,
    totalParticipants,
    isLoading: slotsQuery.isLoading,
    addSlot,
    removeSlot,
  };
}
