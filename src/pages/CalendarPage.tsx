import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { useEvents, EventWithResponse } from "@/hooks/useEvents";
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, addYears, subYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarDayView } from "@/components/calendar/CalendarDayView";
import { CalendarWeekView } from "@/components/calendar/CalendarWeekView";
import { CalendarMonthView } from "@/components/calendar/CalendarMonthView";
import { CalendarYearView } from "@/components/calendar/CalendarYearView";
import { CalendarMiniMonth } from "@/components/calendar/CalendarMiniMonth";
import { EventDetailsSidebar } from "@/components/calendar/EventDetailsSidebar";

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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedEvent, setSelectedEvent] = useState<(EventWithResponse & { isCancelled?: boolean }) | null>(null);

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

  // Add cancellation status to events
  const eventsWithStatus = useMemo(() => {
    return events.map((event) => {
      const isCancelled = allExceptions.some(
        ex => ex.event_id === event.id && ex.exception_date === event.event_date
      );
      return { ...event, isCancelled };
    });
  }, [events, allExceptions]);

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
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Top Navigation Bar */}
        <div className="flex-shrink-0 border-b border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between">
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
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Link to="/create-event">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Event
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar View */}
          <div className="flex-1 overflow-auto p-4">
            {viewMode === "day" && (
              <CalendarDayView
                selectedDate={selectedDate}
                events={eventsWithStatus}
                onEventClick={handleEventClick}
              />
            )}
            {viewMode === "week" && (
              <CalendarWeekView
                selectedDate={selectedDate}
                events={eventsWithStatus}
                onDateClick={handleDateClick}
                onEventClick={handleEventClick}
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
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
