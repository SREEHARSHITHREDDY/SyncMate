import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Calendar, Clock, Pencil, Trash2, Users, Check, X,
  HelpCircle, Loader2, Repeat, CalendarX, FileText, ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { EventWithResponse } from "@/hooks/useEvents";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MeetingMinutesDialog } from "./MeetingMinutesDialog";
import { getEventHex, getDurationLabel, CATEGORY_COLORS, CategoryType } from "@/lib/eventCategories";

interface Attendee {
  user_id: string;
  response: string;
  profile: { name: string; avatar_url: string | null } | null;
}

interface EventCardProps {
  event: EventWithResponse;
  onEdit?: (event: EventWithResponse) => void;
  onCancelOccurrence?: (event: EventWithResponse) => void;
  showActions?: boolean;
  isCancelled?: boolean;
}

export function EventCard({
  event, onEdit, onCancelOccurrence, showActions = true, isCancelled = false,
}: EventCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [showAttendees, setShowAttendees] = useState(false);
  const [isTogglingComplete, setIsTogglingComplete] = useState(false);
  const [showMinutesDialog, setShowMinutesDialog] = useState(false);

  const isCompleted = event.is_completed || false;
  const isStrikethrough = isCancelled || isCompleted;
  const eventData = event as any;
  const hex = getEventHex(eventData.category, eventData.color);
  const categoryLabel =
    eventData.category && CATEGORY_COLORS[eventData.category as CategoryType]
      ? CATEGORY_COLORS[eventData.category as CategoryType].label
      : null;
  const duration = getDurationLabel(event.event_time, eventData.end_time);
  const endTimeStr = eventData.end_time ? eventData.end_time.slice(0, 5) : null;

  const handleToggleComplete = async () => {
    if (!user || !event.isCreator) return;
    setIsTogglingComplete(true);
    try {
      const { error } = await supabase
        .from("events")
        .update({ is_completed: !isCompleted })
        .eq("id", event.id)
        .eq("creator_id", user.id);
      if (error) throw error;
      toast.success(isCompleted ? "Event marked as incomplete" : "Event marked as completed");
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update event");
    } finally {
      setIsTogglingComplete(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", event.id)
        .eq("creator_id", user.id);
      if (error) throw error;
      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setShowDeleteDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete event");
    } finally {
      setIsDeleting(false);
    }
  };

  // FIX 8: Always refetch attendees on every click — no more stale cached list.
  // Old code checked `if (attendees.length > 0)` and skipped the fetch,
  // meaning new responses were invisible until page refresh.
  const loadAttendees = async () => {
    if (showAttendees) {
      setShowAttendees(false);
      return;
    }
    setLoadingAttendees(true);
    try {
      const { data, error } = await supabase
        .from("event_responses")
        .select("user_id, response, profiles:user_id(name, avatar_url)")
        .eq("event_id", event.id);
      if (error) throw error;
      setAttendees(
        (data || []).map((r: any) => ({
          user_id: r.user_id,
          response: r.response,
          profile: r.profiles,
        }))
      );
      setShowAttendees(true);
    } catch {
      toast.error("Failed to load attendees");
    } finally {
      setLoadingAttendees(false);
    }
  };

  const handleViewPlanDetails = () => {
    navigate(`/calendar?date=${event.event_date}`);
  };

  const getPriorityColor = (p: string) => {
    if (p === "low") return "bg-blue-500";
    if (p === "high") return "bg-red-500";
    return "bg-amber-500";
  };

  const getResponseIcon = (r: string) => {
    if (r === "yes") return <Check className="h-3 w-3 text-green-500" />;
    if (r === "no") return <X className="h-3 w-3 text-destructive" />;
    if (r === "maybe") return <HelpCircle className="h-3 w-3 text-amber-500" />;
    return <Clock className="h-3 w-3 text-muted-foreground" />;
  };

  const getResponseLabel = (r: string) => {
    if (r === "yes") return "Going";
    if (r === "no") return "Not going";
    if (r === "maybe") return "Maybe";
    return "Pending";
  };

  return (
    <Card
      className={`overflow-hidden transition-all hover:shadow-md ${isStrikethrough ? "opacity-60" : ""}`}
      style={{ borderLeft: `3px solid ${hex}` }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {event.isCreator && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="mt-1">
                    <Checkbox
                      checked={isCompleted}
                      onCheckedChange={handleToggleComplete}
                      disabled={isTogglingComplete}
                      className="h-5 w-5"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {isCompleted ? "Mark as incomplete" : "Mark as completed"}
                </TooltipContent>
              </Tooltip>
            )}
            <div className={`h-2 w-2 rounded-full mt-2 shrink-0 ${getPriorityColor(event.priority)}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`font-medium truncate ${isStrikethrough ? "line-through text-muted-foreground" : ""}`}>
                  {event.title}
                </h4>
                {categoryLabel && (
                  <Badge variant="secondary" className="text-xs shrink-0 text-white" style={{ backgroundColor: hex + "cc" }}>
                    {categoryLabel}
                  </Badge>
                )}
                {isCancelled && <Badge variant="destructive" className="text-xs shrink-0">Cancelled</Badge>}
                {isCompleted && !isCancelled && <Badge variant="secondary" className="text-xs shrink-0">Completed</Badge>}
                {eventData.recurrence_type && (
                  <Badge variant="secondary" className="gap-1 text-xs shrink-0">
                    <Repeat className="h-3 w-3" />
                    {eventData.recurrence_type}
                  </Badge>
                )}
              </div>
              <div className={`flex items-center gap-3 text-sm mt-1 flex-wrap ${isStrikethrough ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                <span className={`flex items-center gap-1 ${isStrikethrough ? "line-through" : ""}`}>
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(event.event_date), "MMM d, yyyy")}
                </span>
                <span className={`flex items-center gap-1 ${isStrikethrough ? "line-through" : ""}`}>
                  <Clock className="h-3 w-3" />
                  {event.event_time.slice(0, 5)}
                  {endTimeStr && ` – ${endTimeStr}`}
                  <span className="text-xs opacity-70">({duration})</span>
                </span>
              </div>
              {event.description && (
                <p className={`text-sm mt-2 line-clamp-2 ${isStrikethrough ? "line-through text-muted-foreground/70" : "text-muted-foreground"}`}>
                  {event.description}
                </p>
              )}
            </div>
          </div>

          {showActions && event.isCreator && (
            <div className="flex items-center gap-1">
              {eventData.recurrence_type && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onCancelOccurrence?.(event)}>
                      <CalendarX className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cancel specific occurrence</TooltipContent>
                </Tooltip>
              )}
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit?.(event)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Event</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete "{event.title}"? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                      {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground px-2" onClick={handleViewPlanDetails}>
              <ExternalLink className="h-3 w-3" />
              View Plan Details
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground px-2" onClick={loadAttendees} disabled={loadingAttendees}>
              {loadingAttendees ? <Loader2 className="h-3 w-3 animate-spin" /> : <Users className="h-3 w-3" />}
              {showAttendees ? "Hide attendees" : "Show attendees"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground px-2" onClick={() => setShowMinutesDialog(true)}>
              <FileText className="h-3 w-3" />
              Meeting Minutes
            </Button>
          </div>

          {showAttendees && attendees.length > 0 && (
            <div className="mt-2 space-y-2">
              {attendees.map((attendee) => (
                <div key={attendee.user_id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={attendee.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">{attendee.profile?.name?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{attendee.profile?.name || "Unknown"}</span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1">
                        {getResponseIcon(attendee.response)}
                        <span className="text-xs text-muted-foreground">{getResponseLabel(attendee.response)}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{attendee.profile?.name} is {getResponseLabel(attendee.response).toLowerCase()}</TooltipContent>
                  </Tooltip>
                </div>
              ))}
            </div>
          )}
          {showAttendees && attendees.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">No invitees for this event</p>
          )}
        </div>

        <MeetingMinutesDialog
          eventId={event.id}
          eventTitle={event.title}
          eventDate={format(parseISO(event.event_date), "MMMM d, yyyy")}
          open={showMinutesDialog}
          onOpenChange={setShowMinutesDialog}
          canEdit={event.isCreator || event.response === "yes"}
        />
      </CardContent>
    </Card>
  );
}