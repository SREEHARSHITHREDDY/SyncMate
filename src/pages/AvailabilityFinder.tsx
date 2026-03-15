import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Users, Clock, CalendarCheck, Info, ArrowRight } from "lucide-react";
import { useFriends } from "@/hooks/useFriends";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  addDays,
  format,
  isToday,
  isTomorrow,
  isWeekend,
  parseISO,
  isSameDay,
} from "date-fns";
import { QuickEventDialog } from "@/components/calendar/QuickEventDialog";

// Hours displayed in the grid (9am – 9pm)
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

// How many days ahead to show
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
  const [hoveredSlot, setHoveredSlot] = useState<{ dayIndex: number; hour: number } | null>(null);

  // The next 7 days starting from today
  const days = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(new Date(), i)),
    []
  );

  // Get the other user's ID from a friendship record
  const getFriendUserId = (friend: ReturnType<typeof useFriends>["friends"][0]) =>
    friend.requester_id === user?.id ? friend.receiver_id : friend.requester_id;

  const toggleFriend = (userId: string) => {
    setSelectedFriendIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // Build a set of "day+hour" strings that are busy for the current user
  // based on their own events.
  const myBusySlots = useMemo(() => {
    const busy = new Set<string>();
    events.forEach((event) => {
      if (event.is_completed) return;
      const [h] = event.event_time.split(":").map(Number);
      // Mark the event hour AND one hour after as busy
      busy.add(`${event.event_date}-${h}`);
      busy.add(`${event.event_date}-${h + 1}`);
    });
    return busy;
  }, [events]);

  // For each slot, determine its status:
  // "free"   — current user has nothing scheduled
  // "busy"   — current user has an event
  // (Friend availability: in a full implementation you'd query friend events
  //  via a Supabase RPC that respects privacy. For now, we show your own
  //  availability accurately and indicate selected friends with a badge.)
  const getSlotStatus = (day: Date, hour: number): "free" | "busy" => {
    const dateStr = format(day, "yyyy-MM-dd");
    return myBusySlots.has(`${dateStr}-${hour}`) ? "busy" : "free";
  };

  // Events happening in a specific slot (for tooltip)
  const getSlotEvents = (day: Date, hour: number) => {
    return events.filter((e) => {
      if (e.is_completed) return false;
      const [h] = e.event_time.split(":").map(Number);
      return isSameDay(parseISO(e.event_date), day) && (h === hour || h + 1 === hour);
    });
  };

  const handleSlotClick = (day: Date, hour: number) => {
    if (getSlotStatus(day, hour) === "busy") return;
    const timeStr = `${hour.toString().padStart(2, "0")}:00`;
    setSelectedSlot({ date: day, time: timeStr });
    setQuickEventOpen(true);
  };

  // Count how many free consecutive slots exist (useful for planning longer meetups)
  const freeSlotCount = useMemo(() => {
    let count = 0;
    days.forEach((day) => {
      HOURS.forEach((hour) => {
        if (getSlotStatus(day, hour) === "free") count++;
      });
    });
    return count;
  }, [myBusySlots, days]);

  const selectedFriends = friends.filter((f) =>
    selectedFriendIds.includes(getFriendUserId(f))
  );

  return (
    <AppLayout>
      <div className="container py-8 max-w-5xl">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-semibold mb-2 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            Find Free Time
          </h1>
          <p className="text-muted-foreground">
            See when you're available over the next 7 days. Click a free slot to schedule something.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Left panel: friend selector + summary */}
          <div className="space-y-4">
            {/* Friends panel */}
            <Card className="animate-fade-in">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Your Friends
                </CardTitle>
                <CardDescription className="text-xs">
                  Select friends to plan with (coming soon: see their availability too)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {friendsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading friends...</p>
                ) : friends.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Add friends to plan together
                    </p>
                    <Link to="/friends">
                      <Button variant="outline" size="sm" className="gap-1">
                        <Users className="h-3 w-3" />
                        Add Friends
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {friends.map((friend) => {
                      const userId = getFriendUserId(friend);
                      const isSelected = selectedFriendIds.includes(userId);
                      return (
                        <button
                          key={friend.id}
                          onClick={() => toggleFriend(userId)}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-sm transition-all text-left ${
                            isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/40 hover:bg-secondary/50"
                          }`}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={friend.profile?.avatar_url || undefined} />
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {friend.profile?.name?.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate font-medium">
                            {friend.profile?.name || "Unknown"}
                          </span>
                          {isSelected && (
                            <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0 shrink-0">
                              Selected
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Summary card */}
            <Card className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  Your week
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Free slots (9am–9pm)</span>
                  <span className="font-semibold text-primary">{freeSlotCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Busy slots</span>
                  <span className="font-semibold">
                    {HOURS.length * DAYS_AHEAD - freeSlotCount}
                  </span>
                </div>
                {selectedFriends.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Planning with:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedFriends.map((f) => (
                        <Badge key={f.id} variant="secondary" className="text-xs">
                          {f.profile?.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="pt-2 border-t flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3 w-3 shrink-0 mt-0.5" />
                  <span>
                    Click any green slot to create an event at that time
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: availability grid */}
          <Card className="animate-fade-in" style={{ animationDelay: "0.05s" }}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Next 7 days
                </CardTitle>
                {/* Legend */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <div className="h-3 w-5 rounded-sm bg-green-500/25 border border-green-500/40" />
                    Free
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="h-3 w-5 rounded-sm bg-red-500/20 border border-red-500/30" />
                    Busy
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto pb-4">
              <div className="min-w-[500px]">
                {/* Day headers */}
                <div
                  className="grid gap-1 mb-1"
                  style={{ gridTemplateColumns: `52px repeat(${DAYS_AHEAD}, 1fr)` }}
                >
                  <div /> {/* time column spacer */}
                  {days.map((day) => (
                    <div key={day.toISOString()} className="text-center px-1">
                      <div
                        className={`text-[11px] font-medium ${
                          isToday(day) ? "text-primary" : "text-muted-foreground"
                        }`}
                      >
                        {formatDayLabel(day)}
                      </div>
                      <div
                        className={`text-base font-bold leading-none mt-0.5 ${
                          isToday(day)
                            ? "text-primary"
                            : isWeekend(day)
                            ? "text-muted-foreground"
                            : ""
                        }`}
                      >
                        {format(day, "d")}
                      </div>
                      <div className="text-[10px] text-muted-foreground/60">
                        {format(day, "MMM")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Hour rows */}
                <div className="space-y-0.5">
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="grid gap-1 items-center"
                      style={{ gridTemplateColumns: `52px repeat(${DAYS_AHEAD}, 1fr)` }}
                    >
                      {/* Time label */}
                      <div className="text-[11px] text-muted-foreground text-right pr-2 leading-none">
                        {formatHour(hour)}
                      </div>

                      {/* Slots */}
                      {days.map((day, dayIndex) => {
                        const status = getSlotStatus(day, hour);
                        const slotEvents = getSlotEvents(day, hour);
                        const isHovered =
                          hoveredSlot?.dayIndex === dayIndex && hoveredSlot?.hour === hour;

                        return (
                          <Tooltip key={day.toISOString()} delayDuration={200}>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handleSlotClick(day, hour)}
                                onMouseEnter={() => setHoveredSlot({ dayIndex, hour })}
                                onMouseLeave={() => setHoveredSlot(null)}
                                disabled={status === "busy"}
                                className={`h-7 rounded-sm transition-all border text-[10px] font-medium w-full ${
                                  status === "free"
                                    ? "bg-green-500/15 border-green-500/30 hover:bg-green-500/35 hover:border-green-500/60 cursor-pointer"
                                    : "bg-red-400/15 border-red-400/25 cursor-not-allowed"
                                } ${isToday(day) ? "ring-1 ring-primary/20" : ""}`}
                                aria-label={`${status === "free" ? "Free" : "Busy"} at ${formatHour(hour)} on ${format(day, "EEE MMM d")}`}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-[200px]">
                              <p className="font-medium">
                                {formatHour(hour)} — {format(day, "EEE, MMM d")}
                              </p>
                              {status === "free" ? (
                                <p className="text-muted-foreground mt-0.5">
                                  You're free! Click to create an event.
                                </p>
                              ) : (
                                <div className="mt-0.5 space-y-0.5">
                                  {slotEvents.map((e) => (
                                    <p key={e.id} className="text-muted-foreground truncate">
                                      • {e.title} ({e.event_time.slice(0, 5)})
                                    </p>
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

      {/* Quick event dialog pre-filled with the clicked slot */}
      <QuickEventDialog
        open={quickEventOpen}
        onOpenChange={setQuickEventOpen}
        initialDate={selectedSlot?.date}
        initialTime={selectedSlot?.time}
      />
    </AppLayout>
  );
}