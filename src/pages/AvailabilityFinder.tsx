import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Users, Clock, CalendarCheck, Info, ArrowRight, Loader2 } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { addDays, format, isToday, isTomorrow, isWeekend, parseISO, isSameDay } from "date-fns";
import { QuickEventDialog } from "@/components/calendar/QuickEventDialog";

const HOURS = [9,10,11,12,13,14,15,16,17,18,19,20,21];
const DAYS_AHEAD = 7;

export default function AvailabilityFinder() {
  const { user } = useAuth();
  const { friends, friendsLoading } = useFriends();
  const { events } = useEvents();

  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [quickEventOpen, setQuickEventOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);
  const [friendEvents, setFriendEvents] = useState<Record<string, any[]>>({});
  const [loadingFriends, setLoadingFriends] = useState<Set<string>>(new Set());

  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(new Date(), i)),
    []
  );

  const getFriendUserId = (friend: any) =>
    friend.requester_id === user?.id ? friend.receiver_id : friend.requester_id;

  const toggleFriend = (userId: string) => {
    setSelectedFriendIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // ✅ FIXED useEffect
  useEffect(() => {
    const fetchFriendEvents = async (userId: string) => {
      setLoadingFriends(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });

      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const endDate = format(addDays(new Date(), DAYS_AHEAD), "yyyy-MM-dd");

        let created: any[] = [];
        try {
          const { data } = await supabase
            .from("events")
            .select("event_date, event_time, end_time, title")
            .eq("creator_id", userId)
            .eq("is_completed", false)
            .gte("event_date", today)
            .lte("event_date", endDate);

          if (data) created = data;
        } catch {}

        let accepted: any[] = [];
        try {
          const { data: responses } = await supabase
            .from("event_responses")
            .select("events(event_date, event_time, end_time, title)")
            .eq("user_id", userId)
            .eq("response", "yes");

          if (responses) {
            accepted = responses
              .map((r: any) => r.events)
              .filter(Boolean)
              .filter((e: any) => e.event_date >= today && e.event_date <= endDate);
          }
        } catch {}

        setFriendEvents(prev => ({
          ...prev,
          [userId]: [...created, ...accepted],
        }));
      } catch (err) {
        console.error(err);
        setFriendEvents(prev => ({ ...prev, [userId]: [] }));
      } finally {
        setLoadingFriends(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    };

    setFriendEvents({});
    selectedFriendIds.forEach(fetchFriendEvents);

  }, [selectedFriendIds]);

  const myBusySlots = useMemo(() => {
    const busy = new Set<string>();
    events.forEach(event => {
      if (event.is_completed) return;
      const [h] = event.event_time.split(":").map(Number);
      busy.add(`${event.event_date}-${h}`);
      busy.add(`${event.event_date}-${h+1}`);
    });
    return busy;
  }, [events]);

  const allBusySlots = useMemo(() => {
    const busy = new Set(myBusySlots);
    selectedFriendIds.forEach(userId => {
      (friendEvents[userId] || []).forEach(event => {
        const [h] = event.event_time.split(":").map(Number);
        busy.add(`${event.event_date}-${h}`);
        busy.add(`${event.event_date}-${h+1}`);
      });
    });
    return busy;
  }, [myBusySlots, friendEvents, selectedFriendIds]);

  const getSlotStatus = (day: Date, hour: number) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const key = `${dateStr}-${hour}`;
    if (myBusySlots.has(key)) return "my-busy";
    if (allBusySlots.has(key)) return "busy";
    return "free";
  };

  const handleSlotClick = (day: Date, hour: number) => {
    if (getSlotStatus(day, hour) !== "free") return;
    setSelectedSlot({ date: day, time: `${hour}:00` });
    setQuickEventOpen(true);
  };

  const freeSlotCount = useMemo(() => {
    let count = 0;
    days.forEach(day => {
      HOURS.forEach(hour => {
        if (getSlotStatus(day, hour) === "free") count++;
      });
    });
    return count;
  }, [allBusySlots, days]);

  const selectedFriends = friends.filter(f =>
    selectedFriendIds.includes(getFriendUserId(f))
  );

  const isLoadingAny = loadingFriends.size > 0;

  return (
    <AppLayout>
      <div className="container py-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Zap /> Find Free Time
        </h1>

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          
          {/* LEFT PANEL */}
          <Card>
            <CardHeader>
              <CardTitle><Users /> Friends</CardTitle>
            </CardHeader>
            <CardContent>
              {friends.map(friend => {
                const userId = getFriendUserId(friend);
                const selected = selectedFriendIds.includes(userId);
                return (
                  <button
                    key={friend.id}
                    onClick={() => toggleFriend(userId)}
                    className={`w-full p-2 border rounded mb-2 ${
                      selected ? "bg-primary/10 border-primary" : ""
                    }`}
                  >
                    {friend.profile?.name}
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* GRID */}
          <Card>
            <CardHeader>
              <CardTitle><Clock /> Availability</CardTitle>
              {isLoadingAny && <Loader2 className="animate-spin" />}
            </CardHeader>

            <CardContent>
              {days.map(day => (
                <div key={day.toISOString()} className="mb-3">
                  <div className="font-semibold mb-1">
                    {format(day, "EEE dd")}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {HOURS.map(hour => {
                      const status = getSlotStatus(day, hour);
                      return (
                        <button
                          key={hour}
                          onClick={() => handleSlotClick(day, hour)}
                          className={`px-2 py-1 text-xs border rounded ${
                            status === "free"
                              ? "bg-green-200"
                              : status === "my-busy"
                              ? "bg-yellow-200"
                              : "bg-red-200"
                          }`}
                        >
                          {hour}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

        <QuickEventDialog
          open={quickEventOpen}
          onOpenChange={setQuickEventOpen}
          initialDate={selectedSlot?.date}
          initialTime={selectedSlot?.time}
        />
      </div>
    </AppLayout>
  );
}