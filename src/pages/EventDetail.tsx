import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import { CommitmentPanel } from "@/components/CommitmentPanel";
import { LifecycleTracker } from "@/components/LifecycleTracker";
import { FreezePlanButton } from "@/components/FreezePlanButton";
import { usePlanLifecycle, LifecycleStatus } from "@/hooks/usePlanLifecycle";
import { Calendar, Clock, ArrowLeft, Loader2, Flag } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function EventDetail() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const eventQuery = useQuery({
    queryKey: ["event-detail", eventId],
    queryFn: async () => {
      if (!eventId) throw new Error("No event ID");
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId && !!user,
  });

  const { setSuggestedTime, updateLifecycle } = usePlanLifecycle(eventId || "");

  const event = eventQuery.data;
  const isCreator = event?.creator_id === user?.id;
  const lifecycleStatus = (event?.lifecycle_status || "proposed") as LifecycleStatus;

  if (eventQuery.isLoading) {
    return (
      <AppLayout>
        <div className="container py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout>
        <div className="container py-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Event not found</h2>
          <Link to="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  const priorityColors: Record<string, string> = {
    low: "bg-priority-low",
    medium: "bg-priority-medium",
    high: "bg-priority-high",
  };

  return (
    <AppLayout>
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-6 animate-fade-in">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="gap-1 mb-3 -ml-2">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold mb-1">{event.title}</h1>
              <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {format(parseISO(event.event_date), "EEEE, MMMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {event.event_time.slice(0, 5)}
                </span>
                <span className="flex items-center gap-1">
                  <Flag className="h-3.5 w-3.5" />
                  <span className={`h-2 w-2 rounded-full ${priorityColors[event.priority] || ""}`} />
                  {event.priority}
                </span>
              </div>
              {event.description && (
                <p className="text-muted-foreground mt-2">{event.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Lifecycle Tracker */}
        <Card className="mb-4 animate-fade-in-up" style={{ animationDelay: "0.05s" }}>
          <CardContent className="pt-4 pb-4">
            <LifecycleTracker currentStatus={lifecycleStatus} />
            {/* Suggested time display */}
            {event.suggested_date && (
              <div className="mt-3 p-3 rounded-lg border bg-primary/5">
                <p className="text-xs text-muted-foreground mb-0.5">Best Suggested Time</p>
                <p className="text-sm font-medium text-primary">
                  {format(parseISO(event.suggested_date), "MMM d, yyyy")} ·{" "}
                  {event.suggested_start_time?.slice(0, 5)} – {event.suggested_end_time?.slice(0, 5)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lifecycle actions for creator */}
        {isCreator && (
          <div className="flex gap-2 flex-wrap mb-4">
            {lifecycleStatus === "proposed" && (
              <Button size="sm" variant="outline" onClick={() => updateLifecycle.mutate("availability_collected")}>
                Mark Availability Collected
              </Button>
            )}
            {lifecycleStatus === "suggested" && (
              <Button size="sm" variant="outline" onClick={() => updateLifecycle.mutate("confirmed")}>
                Confirm Plan
              </Button>
            )}
            {lifecycleStatus === "confirmed" && (
              <FreezePlanButton eventId={event.id} isFrozen={event.is_frozen} isCreator={isCreator} />
            )}
          </div>
        )}

        {/* Freeze indicator (non-creator) */}
        {!isCreator && event.is_frozen && (
          <div className="mb-4">
            <FreezePlanButton eventId={event.id} isFrozen={true} isCreator={false} />
          </div>
        )}

        {/* Main content grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Availability Grid */}
          <AvailabilityGrid
            eventId={event.id}
            eventDate={event.event_date}
            isCreator={isCreator}
            onSelectBestSlot={(date, start, end) => {
              setSuggestedTime.mutate({ date, start, end });
            }}
          />

          {/* Commitment Panel */}
          <CommitmentPanel eventId={event.id} isParticipant={!isCreator} />
        </div>
      </div>
    </AppLayout>
  );
}
