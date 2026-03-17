import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Flag, ArrowRight, Check, Loader2, Tag, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFriends } from "@/hooks/useFriends";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RecurrenceSelect, RecurrenceType } from "@/components/RecurrenceSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_COLORS, CategoryType, COLOR_PALETTE } from "@/lib/eventCategories";
import { useQueryClient } from "@tanstack/react-query";

type Priority = "low" | "medium" | "high";

export default function CreateEvent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { friends } = useFriends();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [endTime, setEndTime] = useState("");           // NEW
  const [color, setColor] = useState<string | null>(null); // NEW
  const [priority, setPriority] = useState<Priority>("medium");
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | undefined>();
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState<CategoryType>("general");

  // Pre-fill from template params
  useEffect(() => {
    const templateTitle = searchParams.get("title");
    const templateDesc = searchParams.get("description");
    const templateTime = searchParams.get("time");
    const templatePriority = searchParams.get("priority") as Priority | null;
    const templateRecurrence = searchParams.get("recurrence");

    if (templateTitle) setTitle(templateTitle);
    if (templateDesc) setDescription(templateDesc);
    if (templateTime) setTime(templateTime);
    if (templatePriority && ["low", "medium", "high"].includes(templatePriority)) {
      setPriority(templatePriority);
    }
    if (templateRecurrence && ["daily", "weekly", "monthly"].includes(templateRecurrence)) {
      setRecurrenceType(templateRecurrence as RecurrenceType);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // Auto-set end time 1hr after start when start changes
  useEffect(() => {
    if (time && !endTime) {
      const [h, m] = time.split(":").map(Number);
      const endH = Math.floor((h * 60 + m + 60) / 60) % 24;
      const endM = (h * 60 + m + 60) % 60;
      setEndTime(`${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`);
    }
  }, [time]);

  const toggleFriend = (friendUserId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendUserId)
        ? prev.filter((id) => id !== friendUserId)
        : [...prev, friendUserId]
    );
  };

  const getFriendUserId = (friend: typeof friends[0]) => {
    return friend.requester_id === user?.id ? friend.receiver_id : friend.requester_id;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!title.trim()) { toast.error("Please enter an event title"); return; }
    if (!date) { toast.error("Please select a date"); return; }
    if (!time) { toast.error("Please select a time"); return; }

    // Validate end time is after start time
    if (endTime && endTime <= time) {
      toast.error("End time must be after start time");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: event, error: eventError } = await supabase
        .from("events")
        .insert({
          creator_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          event_date: format(date, "yyyy-MM-dd"),
          event_time: time,
          end_time: endTime || null,
          color: color || null,
          priority,
          category,
          recurrence_type: recurrenceType === "none" ? null : recurrenceType,
          recurrence_end_date: recurrenceEndDate ? format(recurrenceEndDate, "yyyy-MM-dd") : null,
        })
        .select()
        .single();

      if (eventError) throw eventError;

      if (selectedFriends.length > 0) {
        const responses = selectedFriends.map((friendId) => ({
          event_id: event.id,
          user_id: friendId,
          response: "pending",
        }));
        const { error: responsesError } = await supabase.from("event_responses").insert(responses);
        if (responsesError) throw responsesError;
      }

      toast.success("Event created successfully!");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-2xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-semibold mb-2">Create Event</h1>
          <p className="text-muted-foreground">Plan something fun with your friends</p>
        </div>

        <Card className="shadow-soft animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>Fill in the basics about your event</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Event Title
              </Label>
              <Input
                id="title"
                placeholder="Coffee catch-up, Movie night, etc."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                  >
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Start + End Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Start Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  End Time
                  <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Input
                  id="end-time"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  min={time || undefined}
                />
              </div>
            </div>
            {endTime && time && endTime <= time && (
              <p className="text-xs text-destructive -mt-4">End time must be after start time</p>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                placeholder="Add any extra details about the event..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Category + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  Category
                </Label>
                <Select value={category} onValueChange={(v) => setCategory(v as CategoryType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_COLORS).map(([key, { label, hex }]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: hex }} />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-muted-foreground" />
                  Priority
                </Label>
                <div className="flex gap-1">
                  {(["low", "medium", "high"] as Priority[]).map((p) => (
                    <Button
                      key={p}
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn("flex-1 capitalize text-xs", priority === p && "border-primary bg-primary/5 text-primary")}
                      onClick={() => setPriority(p)}
                    >
                      {p}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                Color
                <span className="text-xs text-muted-foreground font-normal">(optional — overrides category color)</span>
              </Label>
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setColor(null)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 bg-secondary transition-transform text-xs",
                    color === null ? "border-primary scale-110" : "border-border"
                  )}
                  title="Auto (from category)"
                >
                  <span className="sr-only">Auto</span>
                  <span className="flex items-center justify-center text-[10px] font-bold text-muted-foreground">A</span>
                </button>
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition-transform",
                      color === c.hex ? "border-primary scale-110" : "border-transparent"
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Recurrence */}
            <RecurrenceSelect
              recurrenceType={recurrenceType}
              recurrenceEndDate={recurrenceEndDate}
              onRecurrenceTypeChange={setRecurrenceType}
              onRecurrenceEndDateChange={setRecurrenceEndDate}
            />

            {/* Invite Friends */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Invite Friends
                {selectedFriends.length > 0 && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                    {selectedFriends.length} selected
                  </span>
                )}
              </Label>
              {friends.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-lg border bg-secondary/30 divide-y divide-border">
                  {friends.map((friend) => {
                    const friendUserId = getFriendUserId(friend);
                    const profile = friend.profile;
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center gap-3 p-3 hover:bg-secondary/50 cursor-pointer transition-colors"
                        onClick={() => toggleFriend(friendUserId)}
                      >
                        <Checkbox
                          checked={selectedFriends.includes(friendUserId)}
                          onCheckedChange={() => toggleFriend(friendUserId)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {profile?.name?.slice(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{profile?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate">{profile?.email || ""}</p>
                        </div>
                        {selectedFriends.includes(friendUserId) && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-secondary/50 text-center">
                  <Users className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Add friends first to invite them to events</p>
                  <Button variant="link" size="sm" onClick={() => navigate("/friends")} className="mt-2">
                    Go to Friends
                  </Button>
                </div>
              )}
            </div>

            <Button className="w-full gap-2" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Creating...</>
              ) : (
                <><ArrowRight className="h-4 w-4" />Create Event</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}