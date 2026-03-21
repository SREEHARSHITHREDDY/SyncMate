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
import { supabase } from "@/lib/supabase";
import { Link } from "react-router-dom";
import { addDays, format, isToday, isTomorrow, isWeekend, parseISO, isSameDay } from "date-fns";
import { QuickEventDialog } from "@/components/calendar/QuickEventDialog";

const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
const DAYS_AHEAD = 7;

function formatHour(h: number) {
  return format(new Date(2000, 0, 1, h), "h a");
}

function formatDayLabel(d: Date) {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE");
}

export default function AvailabilityFinder() {
  const { user } = useAuth();
  const { friends, friendsLoading } = useFriends();
  const { events } = useEvents();

  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [quickEventOpen, setQuickEventOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);
  // FIX 12: store fetched friend events keyed by userId
  const [friendEvents, setFriendEvents] = useState<Record<string, { event_date: string; event_time: string; end_time: string | null; title: string }[]>>({});
  const [loadingFriends, setLoadingFriends] = useState<Set<string>>(new Set());

  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(new Date(), i)),
    []
  );

  const getFriendUserId = (friend: ReturnType<typeof useFriends>["friends"][0]) =>
    friend.requester_id === user?.id ? friend.receiver_id : friend.requester_id;

  const toggleFriend = (userId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };


  // FIX: removed stale cache check — always refetches when selectedFriendIds changes
  useEffect(() => {
    const fetchFriendEvents = async (userId: string) => {
      setLoadingFriends(prev => new Set(prev).add(userId));
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const endDate = format(addDays(new Date(), DAYS_AHEAD), "yyyy-MM-dd");

        // Get events they created — RLS on events table may block this
        // so we wrap in try/catch and fall back to empty array
        let created: any[] = [];
        try {
          const { data, error } = await supabase
            .from("events")
            .select("event_date, event_time, end_time, title")
            .eq("creator_id", userId)
            .eq("is_completed", false)
            .gte("event_date", today)
            .lte("event_date", endDate);
          if (!error && data) created = data;
        } catch {}

        // Get events they accepted via event_responses
        let accepted: any[] = [];
        try {
          const { data: responses, error } = await supabase
            .from("event_responses")
            .select("events(event_date, event_time, end_time, title)")
            .eq("user_id", userId)
            .eq("response", "yes");

          if (!error && responses) {
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
        console.error("Failed to fetch friend events:", err);
        setFriendEvents(prev => ({ ...prev, [userId]: [] }));
      } finally {
        setLoadingFriends(prev => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    };

    // Clear old friend events and refetch all selected friends
    setFriendEvents({});
    selectedFriendIds.forEach(fetchFriendEvents);
  }, [selectedFriendIds]);

  // My busy slots
  const myBusySlots = useMemo(() => {
    const busy = new Set<string>();
    events.forEach((event) => {
      if (event.is_completed) return;
      const [h] = event.event_time.split(":").map(Number);
      busy.add(`${event.event_date}-${h}`);
      busy.add(`${event.event_date}-${h + 1}`);
    });
    return busy;
  }, [events]);

  // FIX 12: combined busy slots — my slots + all selected friends' slots
  const allBusySlots = useMemo(() => {
    const busy = new Set(myBusySlots);
    selectedFriendIds.forEach(userId => {
      (friendEvents[userId] || []).forEach(event => {
        const [h] = event.event_time.split(":").map(Number);
        busy.add(`${event.event_date}-${h}`);
        busy.add(`${event.event_date}-${h + 1}`);
      });
    });
    return busy;
  }, [myBusySlots, friendEvents, selectedFriendIds]);

  // Slot is free only if EVERYONE is free
  const getSlotStatus = (day: Date, hour: number): "free" | "busy" | "my-busy" => {
    const dateStr = format(day, "yyyy-MM-dd");
    const key = `${dateStr}-${hour}`;
    if (myBusySlots.has(key)) return "my-busy";
    if (allBusySlots.has(key)) return "busy";
    return "free";
  };

  const getSlotEvents = (day: Date, hour: number) => {
    return events.filter((e) => {
      if (e.is_completed) return false;
      const [h] = e.event_time.split(":").map(Number);
      return isSameDay(parseISO(e.event_date), day) && (h === hour || h + 1 === hour);
    });
  };

  const getFriendSlotEvents = (day: Date, hour: number) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const results: { name: string; title: string }[] = [];
    selectedFriendIds.forEach(userId => {
      (friendEvents[userId] || []).forEach(event => {
        if (event.event_date !== dateStr) return;
        const [h] = event.event_time.split(":").map(Number);
        if (h === hour || h + 1 === hour) {
          const friend = friends.find(f => getFriendUserId(f) === userId);
          results.push({ name: friend?.profile?.name || "Friend", title: event.title });
        }
      });
    });
    return results;
  };

  const handleSlotClick = (day: Date, hour: number) => {
    if (getSlotStatus(day, hour) !== "free") return;
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    setSelectedSlot({ date: day, time: timeStr });
    setQuickEventOpen(true);
  };

  const freeSlotCount = useMemo(() => {
    let count = 0;
    days.forEach((day) => {
      HOURS.forEach((hour) => {
        if (getSlotStatus(day, hour) === "free") count++;
      });
    });
    return count;
  }, [allBusySlots, days]);

  const selectedFriends = friends.filter((f) => selectedFriendIds.includes(getFriendUserId(f)));
  const isLoadingAny = loadingFriends.size > 0;

  return (
    <AppLayout>
      <div className="container py-8 max-w-5xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-semibold mb-2 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            Find Free Time
          </h1>
          <p className="text-muted-foreground">
            Select friends to see when everyone is free. Green = everyone free, click to create an event.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Left panel */}
          <div className="space-y-4">
            <Card className="animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Your Friends
                </CardTitle>
                <CardDescription className="text-xs">
                  Select friends to overlay their availability
                </CardDescription>
              </CardHeader>
              <CardContent>
                {friendsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading friends...</p>
                ) : friends.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">Add friends to plan together</p>
                    <Link to="/friends">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Users className="h-3 w-3" />Add Friends<ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => {
                      const userId = getFriendUserId(friend);
                      const isSelected = selectedFriendIds.includes(userId);
                      const isLoading = loadingFriends.has(userId);
                      return (
                        <button
                          key={friend.id}
                          onClick={() => toggleFriend(userId)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                            isSelected ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40 hover:bg-secondary/50"
                          }`}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={friend.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {friend.profile?.name?.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium">{friend.profile?.name || "Unknown"}</span>
                          {isLoading && <Loader2 className="h-3 w-3 animate-spin ml-auto shrink-0" />}
                          {isSelected && !isLoading && (
                            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 shrink-0">On</Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Free slots (everyone)</span>
                  <span className="font-semibold text-primary">{freeSlotCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Busy slots</span>
                  <span className="font-semibold">{HOURS.length * DAYS_AHEAD - freeSlotCount}</span>
                </div>
                {selectedFriends.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Planning with:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedFriends.map((f) => (
                        <Badge key={f.id} variant="secondary" className="text-xs">{f.profile?.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>Green = everyone free. Click to create an event.</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grid */}
          <Card className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Next 7 days
                  {isLoadingAny && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </CardTitle>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <div className="h-3 w-5 rounded-sm bg-green-500/25 border border-green-500/40" />
                    Free
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="h-3 w-5 rounded-sm bg-amber-500/20 border border-amber-500/30" />
                    Your event
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="h-3 w-5 rounded-sm bg-red-500/20 border border-red-500/30" />
                    Friend busy
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto pb-4">
              <div className="min-w-[500px]">
                {/* Day headers */}
                <div className="grid gap-1 mb-1" style={{ gridTemplateColumns: `52px repeat(${DAYS_AHEAD}, 1fr)` }}>
                  <div />
                  {days.map((day) => (
                    <div key={day.toISOString()} className="text-center px-1 pb-2">
                      <div className={`text-[11px] font-medium ${isToday(day) ? "text-primary" : "text-muted-foreground"}`}>
                        {formatDayLabel(day)}
                      </div>
                      <div className={`text-xl font-bold leading-tight ${isToday(day) ? "text-primary" : isWeekend(day) ? "text-muted-foreground" : ""}`}>
                        {format(day, "d")}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60">{format(day, "MMM")}</div>
                    </div>
                  ))}
                </div>

                {/* Hour rows */}
                <div className="space-y-0.5">
                  {HOURS.map((hour) => (
                    <div key={hour} className="grid gap-1 items-center" style={{ gridTemplateColumns: `52px repeat(${DAYS_AHEAD}, 1fr)` }}>
                      <div className="text-[11px] text-muted-foreground text-right pr-2 leading-none">
                        {formatHour(hour)}
                      </div>
                      {days.map((day) => {
                        const status = getSlotStatus(day, hour);
                        const slotEvents = getSlotEvents(day, hour);
                        const friendSlotEvents = getFriendSlotEvents(day, hour);

                        return (
                          <Tooltip key={day.toISOString()} delayDuration={200}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleSlotClick(day, hour)}
                                disabled={status !== "free"}
                                className={`h-10 rounded-md transition-all border text-[10px] font-medium w-full ${
                                  status === "free"
                                    ? "bg-green-500/20 border-green-500/40 hover:bg-green-500/40 hover:border-green-500/70 cursor-pointer"
                                    : status === "my-busy"
                                    ? "bg-amber-400/20 border-amber-400/30 cursor-not-allowed"
                                    : "bg-red-400/20 border-red-400/30 cursor-not-allowed"
                                } ${isToday(day) ? "ring-1 ring-primary/20" : ""}`}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-[200px]">
                              <p className="font-medium">{formatHour(hour)} — {format(day, "EEE, MMM d")}</p>
                              {status === "free" ? (
                                <p className="text-muted-foreground mt-0.5">Everyone is free! Click to create.</p>
                              ) : (
                                <div className="mt-0.5 space-y-0.5">
                                  {slotEvents.map((e) => (
                                    <p key={e.id} className="text-muted-foreground truncate">• You: {e.title}</p>
                                  ))}
                                  {friendSlotEvents.map((e, i) => (
                                    <p key={i} className="text-muted-foreground truncate">• {e.name}: {e.title}</p>
                                  ))}
                                </div>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <QuickEventDialog
        open={quickEventOpen}
        onOpenChange={setQuickEventOpen}
        initialDate={selectedSlot?.date}
        initialTime={selectedSlot?.time}
      />
    </AppLayout>
  );
}