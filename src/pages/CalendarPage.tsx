import { useState, useMemo, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Filter, Calendar, CheckSquare, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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
import { CategoryFilter } from "@/components/calendar/CategoryFilter";
import { QuickEventDialog } from "@/components/calendar/QuickEventDialog";
import { EditEventDialog } from "@/components/EditEventDialog";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { CategoryType } from "@/lib/eventCategories";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [selectedCategories, setSelectedCategories] = useState<CategoryType[]>([]);

  // Quick event dialog
  const [quickEventOpen, setQuickEventOpen] = useState(false);
  const [quickEventDate, setQuickEventDate] = useState<Date>();
  const [quickEventTime, setQuickEventTime] = useState<string>();

  // Edit event dialog
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [eventToEdit, setEventToEdit] = useState<EventWithResponse | null>(null);

  // Create task/reminder dialog
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskDialogType, setTaskDialogType] = useState<"task" | "reminder">("task");

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
    staleTime: 1000 * 60 * 2,
  });

  const eventsWithStatus = useMemo(() => {
    let filtered = events.map((event) => {
      const isCancelled = allExceptions.some(
        ex => ex.event_id === event.id && ex.exception_date === event.event_date
      );
      return { ...event, isCancelled };
    });
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(event =>
        selectedCategories.includes(((event as any).category || "general") as CategoryType)
      );
    }
    return filtered;
  }, [events, allExceptions, selectedCategories]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const goToPrev = () => {
    switch (viewMode) {
      case "day": setSelectedDate(subDays(selectedDate, 1)); break;
      case "week": setSelectedDate(subWeeks(selectedDate, 1)); break;
      case "month": setSelectedDate(subMonths(selectedDate, 1)); break;
      case "year": setSelectedDate(subYears(selectedDate, 1)); break;
    }
  };

  const goToNext = () => {
    switch (viewMode) {
      case "day": setSelectedDate(addDays(selectedDate, 1)); break;
      case "week": setSelectedDate(addWeeks(selectedDate, 1)); break;
      case "month": setSelectedDate(addMonths(selectedDate, 1)); break;
      case "year": setSelectedDate(addYears(selectedDate, 1)); break;
    }
  };

  const goToToday = () => setSelectedDate(new Date());

  const getHeaderTitle = () => {
    switch (viewMode) {
      case "day": return format(selectedDate, "d MMMM yyyy");
      case "week": return format(selectedDate, "MMMM yyyy");
      case "month": return format(selectedDate, "MMMM yyyy");
      case "year": return format(selectedDate, "yyyy");
    }
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    if (viewMode === "month" || viewMode === "year") setViewMode("day");
  };

  const handleMonthClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode("month");
  };

  const handleEventClick = (event: EventWithResponse) => {
    const eventWithStatus = eventsWithStatus.find(e => e.id === event.id);
    setSelectedEvent(eventWithStatus || { ...event, isCancelled: false });
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

  const openCreateTask = (type: "task" | "reminder") => {
    setTaskDialogType(type);
    setTaskDialogOpen(true);
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Top bar */}
        <div className="flex-shrink-0 border-b border-border bg-background px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left — navigation */}
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-semibold">{getHeaderTitle()}</h1>
            </div>

            {/* Center — view tabs */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="bg-secondary">
                <TabsTrigger value="day" className="px-4">Day</TabsTrigger>
                <TabsTrigger value="week" className="px-4">Week</TabsTrigger>
                <TabsTrigger value="month" className="px-4">Month</TabsTrigger>
                <TabsTrigger value="year" className="px-4">Year</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Right — actions */}
            <div className="flex items-center gap-2">
              {/* Category filter */}
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
                      onCategoryToggle={(cat) =>
                        setSelectedCategories(prev =>
                          prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                        )
                      }
                      onClearAll={() => setSelectedCategories([])}
                    />
                  </div>
                </PopoverContent>
              </Popover>

              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>

              {/* ── CREATE DROPDOWN ── */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Create</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    onClick={() => {
                      setQuickEventDate(selectedDate);
                      setQuickEventTime("09:00");
                      setQuickEventOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Calendar className="h-4 w-4 text-primary" />
                    Event
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openCreateTask("task")}
                    className="gap-2"
                  >
                    <CheckSquare className="h-4 w-4 text-amber-500" />
                    Task
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => openCreateTask("reminder")}
                    className="gap-2"
                  >
                    <Bell className="h-4 w-4 text-violet-500" />
                    Reminder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex overflow-hidden">
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

          {/* Right sidebar */}
          <div className="w-72 border-l border-border p-4 flex-shrink-0 overflow-auto hidden lg:block">
            <div className="mb-6">
              <CalendarMiniMonth
                selectedDate={selectedDate}
                onDateClick={(date) => {
                  setSelectedDate(date);
                  if (viewMode === "year") setViewMode("day");
                }}
                onMonthChange={setSelectedDate}
              />
            </div>
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

      {/* Dialogs */}
      <QuickEventDialog
        open={quickEventOpen}
        onOpenChange={setQuickEventOpen}
        initialDate={quickEventDate}
        initialTime={quickEventTime}
      />
      <EditEventDialog
        event={eventToEdit}
        open={editEventOpen}
        onOpenChange={setEditEventOpen}
      />
      <CreateTaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        defaultType={taskDialogType}
        initialDate={selectedDate}
      />
    </AppLayout>
  );
}