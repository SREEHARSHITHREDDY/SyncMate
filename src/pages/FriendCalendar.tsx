import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CalendarDays, Loader2 } from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { useCalendarPermissions } from "@/hooks/useCalendarPermissions";
import { getCategoryColor } from "@/lib/eventCategories";

interface FriendEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  priority: string;
  category: string | null;
}

export default function FriendCalendar() {
  const { friendId } = useParams<{ friendId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { canViewCalendar } = useCalendarPermissions();
  const [permission, setPermission] = useState<ReturnType<typeof canViewCalendar>>(undefined);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  useEffect(() => {
    if (friendId && user) {
      const perm = canViewCalendar(friendId);
      setPermission(perm);
      if (!perm) {
        navigate("/friends");
      }
    }
  }, [friendId, user, canViewCalendar, navigate]);

  // Fetch friend's profile
  const { data: friendProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["friend-profile", friendId],
    queryFn: async () => {
      if (!friendId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", friendId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!friendId && !!user,
  });

  // Fetch friend's events
  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["friend-events", friendId, permission?.view_from_date],
    queryFn: async () => {
      if (!friendId || !permission) return [];

      let query = supabase
        .from("events")
        .select("id, title, description, event_date, event_time, priority, category")
        .eq("creator_id", friendId)
        .order("event_date", { ascending: true });

      // Apply date restriction if set
      if (permission.view_from_date) {
        query = query.gte("event_date", permission.view_from_date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FriendEvent[];
    },
    enabled: !!friendId && !!user && !!permission,
  });

  const isLoading = authLoading || profileLoading || eventsLoading;

  // Group events by date
  const groupedEvents = (events || []).reduce((acc, event) => {
    const date = event.event_date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {} as Record<string, FriendEvent[]>);

  const sortedDates = Object.keys(groupedEvents).sort();

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mb-8 animate-fade-in">
          <Button
            variant="ghost"
            onClick={() => navigate("/friends")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Friends
          </Button>

          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-medium text-primary">
                {friendProfile?.name?.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold">
                {friendProfile?.name || "Friend"}'s Calendar
              </h1>
              {permission?.view_from_date && (
                <p className="text-sm text-muted-foreground">
                  Viewing events from{" "}
                  {format(parseISO(permission.view_from_date), "MMMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sortedDates.length === 0 ? (
          <Card className="animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <CalendarDays className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-medium mb-1">No events found</p>
              <p className="text-sm text-muted-foreground text-center">
                {friendProfile?.name || "Your friend"} doesn't have any upcoming
                events
                {permission?.view_from_date &&
                  ` from ${format(
                    parseISO(permission.view_from_date),
                    "MMMM d, yyyy"
                  )}`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => {
              const dateEvents = groupedEvents[date];
              const isPast = isBefore(parseISO(date), startOfDay(new Date()));

              return (
                <Card
                  key={date}
                  className={`animate-fade-in ${isPast ? "opacity-60" : ""}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dateEvents.map((event) => {
                      const categoryColor = getCategoryColor(event.category);
                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50"
                        >
                          <div
                            className="w-1 h-full min-h-[40px] rounded-full"
                            style={{ backgroundColor: categoryColor }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">
                                {event.title}
                              </span>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  event.priority === "high"
                                    ? "bg-destructive/10 text-destructive"
                                    : event.priority === "medium"
                                    ? "bg-amber-500/10 text-amber-600"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {event.priority}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {event.event_time}
                              {event.category && ` • ${event.category}`}
                            </p>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
