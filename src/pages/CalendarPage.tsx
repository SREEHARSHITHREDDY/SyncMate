import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Filter, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEvents, EventWithResponse } from "@/hooks/useEvents";
import { useCalendarPermissions } from "@/hooks/useCalendarPermissions";
import { useFriendCalendar } from "@/hooks/useFriendCalendar";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, addYears, subYears, parseISO, isAfter, isBefore } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarRange, Clock, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarYearView } from "@/components/calendar/CalendarYearView";
import { CalendarMiniMonth } from "@/components/calendar/CalendarMiniMonth";
import { EventDetailsSidebar } from "@/components/calendar/EventDetailsSidebar";
import { CategoryFilter } from "@/components/calendar/CategoryFilter";
import { QuickEventDialog } from "@/components/calendar/QuickEventDialog";
import { EditEventDialog } from "@/components/EditEventDialog";
import { CategoryType } from "@/lib/eventCategories";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventException {
  id: string;
  event_id: string;
  exception_date: string;
}

type ViewMode = "day" | "week" | "month" | "year";

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { events } = useEvents();
  const { accessibleCalendars } = useCalendarPermissions();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<(EventWithResponse & { isCancelled?: boolean }) | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);
  const [viewingCalendar, setViewingCalendar] = useState<string>("my"); // "my" or friend's user_id
  
  // Quick event dialog state
  const [quickEventOpen, setQuickEventOpen] = useState(false);
  const [quickEventDate, setQuickEventDate] = useState<Date>();
  const [quickEventTime, setQuickEventTime] = useState<string>();
  
  // Edit event dialog state
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventWithResponse | null>(null);

  // Fetch friend's calendar if viewing
  const friendId = viewingCalendar !== "my" ? viewingCalendar : null;
  const { events: friendEvents, exceptions: friendExceptions, permission: friendPermission } = useFriendCalendar(friendId);

  // Check if viewing a restricted calendar
  const viewRestrictions = useMemo(() => {
    if (!friendPermission) return null;
    
    const hasViewFromDate = !!friendPermission.view_from_date;
    const hasExpiresAt = !!friendPermission.expires_at;
    
    if (!hasViewFromDate && !hasExpiresAt) return null;
    
    return {
      viewFromDate: friendPermission.view_from_date,
      expiresAt: friendPermission.expires_at,
    };
  }, [friendPermission]);

  // Fetch all exceptions for the user's events
  const { data: allExceptions = [] } = useQuery({
    queryKey: ["all-event-exceptions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const eventIds = events.map(e => e.id);
      if (eventIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("event_exceptions")
        .select("*")
        .in("event_id", eventIds);
      
      if (error) throw error;
      return data as EventException[];
    },
    enabled: !!user && events.length > 0,
  });

  // Add cancellation status to events and filter by category
  const eventsWithStatus = useMemo(() => {
    // Use friend's events if viewing friend's calendar, otherwise own events
    const activeEvents = viewingCalendar === "my" ? events : friendEvents;
    const activeExceptions = viewingCalendar === "my" ? allExceptions : friendExceptions;
    
    let filtered = activeEvents.map((event) => {
      const isCancelled = activeExceptions.some(
        (ex: EventException) => ex.event_id === event.id && ex.exception_date === event.event_date
      );
      return { ...event, isCancelled };
    });

    // Filter by category if any selected
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(event => 
        selectedCategories.includes(((event as any).category || "default") as CategoryType)
      );
    }

    return filtered;
  }, [events, friendEvents, allExceptions, friendExceptions, selectedCategories, viewingCalendar]);

  // Get the name of the currently viewed calendar
  const viewingCalendarName = useMemo(() => {
    if (viewingCalendar === "my") return "My Calendar";
    const friend = accessibleCalendars.find(c => c.owner_id === viewingCalendar);
    return friend?.profile?.name ? `${friend.profile.name}'s Calendar` : "Friend's Calendar";
  }, [viewingCalendar, accessibleCalendars]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const goToPrev = () => {
    switch (viewMode) {
      case "day":
        setSelectedDate(subDays(selectedDate, 1));
        break;
      case "week":
        setSelectedDate(subWeeks(selectedDate, 1));
        break;
      case "month":
        setSelectedDate(subMonths(selectedDate, 1));
        break;
      case "year":
        setSelectedDate(subYears(selectedDate, 1));
        break;
    }
  };

  const goToNext = () => {
    switch (viewMode) {
      case "day":
        setSelectedDate(addDays(selectedDate, 1));
        break;
      case "week":
        setSelectedDate(addWeeks(selectedDate, 1));
        break;
      case "month":
        setSelectedDate(addMonths(selectedDate, 1));
        break;
      case "year":
        setSelectedDate(addYears(selectedDate, 1));
        break;
    }
  };

  const goToToday = () => setSelectedDate(new Date());

  const getHeaderTitle = () => {
    switch (viewMode) {
      case "day":
        return format(selectedDate, "d MMMM yyyy");
      case "week":
        return format(selectedDate, "MMMM yyyy");
      case "month":
        return format(selectedDate, "MMMM yyyy");
      case "year":
        return format(selectedDate, "yyyy");
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (viewMode === "month" || viewMode === "year") {
      setViewMode("day");
    }
  };

  const handleMonthClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode("month");
  };

  const handleEventClick = (event: EventWithResponse) => {
    const eventWithStatus = eventsWithStatus.find(e => e.id === event.id);
    setSelectedEvent(eventWithStatus || { ...event, isCancelled: false });
    
    // Open edit dialog if user is the creator
    if (event.isCreator) {
      setEventToEdit(event);
      setEditEventOpen(true);
    }
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    setQuickEventDate(date);
    setQuickEventTime(time);
    setQuickEventOpen(true);
  };

  const handleCategoryToggle = (category: CategoryType) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Top Navigation Bar */}
        <div className="flex-shrink-0 border-b border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left side - Navigation */}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">{getHeaderTitle()}</h1>
            </div>

            {/* Center - View Mode Tabs */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="day" className="px-4">Day</TabsTrigger>
                <TabsTrigger value="week" className="px-4">Week</TabsTrigger>
                <TabsTrigger value="month" className="px-4">Month</TabsTrigger>
                <TabsTrigger value="year" className="px-4">Year</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Right side - Actions */}
            <div className="flex items-center gap-2">
              {/* Calendar Selector (only show if user has access to other calendars) */}
              {accessibleCalendars.length > 0 && (
                <Select value={viewingCalendar} onValueChange={setViewingCalendar}>
                  <SelectTrigger className="w-[180px] h-9">
                    <Users className="h-4 w-4 mr-2" />
                    <SelectValue>{viewingCalendarName}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="my">My Calendar</SelectItem>
                    {accessibleCalendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.owner_id}>
                        {cal.profile?.name || "Friend"}'s Calendar
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {/* Category Filter */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                    {selectedCategories.length > 0 && (
                      <span className="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-xs">
                        {selectedCategories.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto" align="end">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Filter by Category</p>
                    <CategoryFilter 
                      selectedCategories={selectedCategories}
                      onCategoryToggle={handleCategoryToggle}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              
              {viewingCalendar === "my" && (
                <Button size="sm" className="gap-2" onClick={() => {
                  setQuickEventDate(selectedDate);
                  setQuickEventTime("09:00");
                  setQuickEventOpen(true);
                }}>
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Event</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* View Restriction Banner */}
        {viewingCalendar !== "my" && viewRestrictions && (
          <div className="flex-shrink-0 px-4 pt-3">
            <Alert className="bg-muted/50 border-primary/20">
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center gap-4 flex-wrap">
                <span className="font-medium">Restricted View:</span>
                {viewRestrictions.viewFromDate && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <CalendarRange className="h-3.5 w-3.5" />
                    Events from {format(parseISO(viewRestrictions.viewFromDate), "MMM d, yyyy")}
                  </span>
                )}
                {viewRestrictions.expiresAt && (
                  <span className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-3.5 w-3.5" />
                    Access expires {format(parseISO(viewRestrictions.expiresAt), "MMM d, yyyy")}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar View */}
          <div className="flex-1 overflow-auto p-4">
            {viewMode === "day" && (
              <CalendarDayView
                selectedDate={selectedDate}
                events={eventsWithStatus}
                onEventClick={handleEventClick}
                onTimeSlotClick={handleTimeSlotClick}
              />
            )}
            {viewMode === "week" && (
              <CalendarWeekView
                selectedDate={selectedDate}
                events={eventsWithStatus}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
                onTimeSlotClick={handleTimeSlotClick}
              />
            )}
            {viewMode === "month" && (
              <CalendarMonthView
                selectedDate={selectedDate}
                events={eventsWithStatus}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === "year" && (
              <CalendarYearView
                selectedDate={selectedDate}
                events={eventsWithStatus}
                onMonthClick={handleMonthClick}
              />
            )}
          </div>

          {/* Right Sidebar */}
          <div className="w-72 border-l border-border p-4 flex-shrink-0 overflow-auto hidden lg:block">
            {/* Mini Month Calendar */}
            <div className="mb-6">
              <CalendarMiniMonth
                selectedDate={selectedDate}
                onDateClick={(date) => {
                  setSelectedDate(date);
                  if (viewMode === "year") {
                    setViewMode("day");
                  }
                }}
                onMonthChange={setSelectedDate}
              />
            </div>

            {/* Selected Event Details */}
            {selectedEvent && (
              <div className="border-t border-border pt-4">
                <EventDetailsSidebar event={selectedEvent} />
                {selectedEvent.isCreator && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-4"
                    onClick={() => {
                      setEventToEdit(selectedEvent);
                      setEditEventOpen(true);
                    }}
                  >
                    Edit Event
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Event Dialog */}
      <QuickEventDialog
        open={quickEventOpen}
        onOpenChange={setQuickEventOpen}
        initialDate={quickEventDate}
        initialTime={quickEventTime}
      />

      {/* Edit Event Dialog */}
      <EditEventDialog
        event={eventToEdit}
        open={editEventOpen}
        onOpenChange={setEditEventOpen}
      />
    </AppLayout>
  );
}
