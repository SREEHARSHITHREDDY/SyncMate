import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Bell, Clock, ArrowRight, ListTodo } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useFriends } from "@/hooks/useFriends";
import { useEvents, EventWithResponse } from "@/hooks/useEvents";
import { useNotifications } from "@/hooks/useNotifications";
import { useUserActionItems } from "@/hooks/useUserActionItems";
import { Button } from "@/components/ui/button";
import { format, isToday, isTomorrow, parseISO } from "date-fns";
import { EventInviteCard } from "@/components/EventInviteCard";
import { SwipeableEventCard } from "@/components/SwipeableEventCard";
import { EditEventDialog } from "@/components/EditEventDialog";
import { PriorityFilter } from "@/components/PriorityFilter";
import { CompletedFilter } from "@/components/CompletedFilter";
import { CancelOccurrenceDialog } from "@/components/CancelOccurrenceDialog";
import { MyActionItems } from "@/components/MyActionItems";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pendingRequests } = useFriends();
  const { events, pendingInvites } = useEvents();
  const { unreadCount } = useNotifications();
  const { totalCount: actionItemCount, overdueCount: overdueActionItems } = useUserActionItems();
  const [editingEvent, setEditingEvent] = useState<EventWithResponse | null>(null);
  const [cancellingEvent, setCancellingEvent] = useState<EventWithResponse | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return null;
  }

  if (!user) {
    return null;
  }

  const userName = user?.user_metadata?.name || "there";

  // Filter events by priority and completion status
  const filteredEvents = useMemo(() => {
    let filtered = events;
    
    // Filter by priority
    if (priorityFilter !== "all") {
      filtered = filtered.filter((e) => e.priority === priorityFilter);
    }
    
    // Filter by completion status
    if (!showCompleted) {
      filtered = filtered.filter((e) => !(e as any).is_completed);
    }
    
    return filtered;
  }, [events, priorityFilter, showCompleted]);

  // Count completed events
  const completedCount = useMemo(() => {
    return events.filter((e) => (e as any).is_completed).length;
  }, [events]);

  // Get upcoming events for this week
  const upcomingEvents = filteredEvents.slice(0, 5);
  const nextEvent = events.filter((e) => !(e as any).is_completed)[0];

  const formatEventDate = (dateStr: string, timeStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) {
      return `Today, ${timeStr.slice(0, 5)}`;
    }
    if (isTomorrow(date)) {
      return `Tomorrow, ${timeStr.slice(0, 5)}`;
    }
    return `${format(date, "EEE, MMM d")}, ${timeStr.slice(0, 5)}`;
  };

  const getTimeUntilNextEvent = () => {
    if (!nextEvent) return null;
    const eventDateTime = new Date(`${nextEvent.event_date}T${nextEvent.event_time}`);
    const now = new Date();
    const diffMs = eventDateTime.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d`;
    if (diffHours > 0) return `${diffHours}h`;
    return "Soon";
  };

  return (
    <AppLayout>
      <div className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-semibold mb-2">{getGreeting()}, {userName}! 👋</h1>
          <p className="text-muted-foreground">Here's what's happening with your plans</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Events
              </CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.filter(e => !(e as any).is_completed).length}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>

          <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Friend Requests
              </CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>

          <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Action Items
              </CardTitle>
              <ListTodo className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{actionItemCount}</div>
              <p className="text-xs text-muted-foreground">
                {overdueActionItems > 0 ? `${overdueActionItems} overdue` : "Assigned to you"}
              </p>
            </CardContent>
          </Card>

          <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.25s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completed
              </CardTitle>
              <Bell className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedCount}</div>
              <p className="text-xs text-muted-foreground">Done</p>
            </CardContent>
          </Card>

          <Card className="card-hover animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Next Event
              </CardTitle>
              <Clock className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTimeUntilNextEvent() || "—"}</div>
              <p className="text-xs text-muted-foreground truncate">
                {nextEvent?.title || "No upcoming events"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* My Action Items */}
        <div className="mb-6">
          <MyActionItems />
        </div>

        {/* Upcoming Events */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Plans</CardTitle>
              <CardDescription>
              {upcomingEvents.length > 0
                  ? "Swipe right on mobile to mark as complete"
                  : "Your scheduled events will appear here"}
              </CardDescription>
            </div>
            <Link to="/create-event">
              <Button size="sm" className="gap-2">
                Create Event
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <PriorityFilter value={priorityFilter} onChange={setPriorityFilter} />
              <CompletedFilter showCompleted={showCompleted} onChange={setShowCompleted} />
            </div>
            {upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event) => (
                  <SwipeableEventCard
                    key={event.id}
                    event={event}
                    onEdit={setEditingEvent}
                    onCancelOccurrence={setCancellingEvent}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Calendar className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">
                  {showCompleted ? "No events yet" : "No active events"}
                </h3>
                <p className="text-muted-foreground max-w-sm mb-4">
                  {showCompleted 
                    ? "Start by creating an event or adding friends to plan something together!"
                    : completedCount > 0 
                      ? "All your events are completed! Toggle the filter to see them."
                      : "Start by creating an event or adding friends to plan something together!"
                  }
                </p>
                <Link to="/create-event">
                  <Button className="gap-2">
                    Create Your First Event
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Event Invites */}
        {pendingInvites.length > 0 && (
          <Card className="animate-fade-in mt-6" style={{ animationDelay: '0.35s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-warning" />
                Event Invitations
              </CardTitle>
              <CardDescription>
                You have {pendingInvites.length} pending invitation{pendingInvites.length > 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {pendingInvites.map((invite) => (
                  <EventInviteCard key={invite.id} event={invite} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Event Dialog */}
        <EditEventDialog
          event={editingEvent}
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
        />

        {/* Cancel Occurrence Dialog */}
        <CancelOccurrenceDialog
          event={cancellingEvent}
          open={!!cancellingEvent}
          onOpenChange={(open) => !open && setCancellingEvent(null)}
        />
      </div>
    </AppLayout>
  );
}
