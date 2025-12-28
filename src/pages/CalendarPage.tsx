import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEvents, EventWithResponse } from "@/hooks/useEvents";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, isToday } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PriorityFilter } from "@/components/PriorityFilter";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { events } = useEvents();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [priorityFilter, setPriorityFilter] = useState<"all" | "low" | "medium" | "high">("all");

  // Filter events by priority
  const filteredEvents = useMemo(() => {
    if (priorityFilter === "all") return events;
    return events.filter((e) => e.priority === priorityFilter);
  }, [events, priorityFilter]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const firstDayOfWeek = calendarDays[0]?.getDay() || 0;

  const getEventsForDay = (day: Date): EventWithResponse[] => {
    return filteredEvents.filter((event) => {
      const eventDate = parseISO(event.event_date);
      return isSameDay(eventDate, day);
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "low":
        return "bg-priority-low";
      case "high":
        return "bg-priority-high";
      default:
        return "bg-priority-medium";
    }
  };

  const monthEvents = useMemo(() => {
    return filteredEvents.filter((event) => {
      const eventDate = parseISO(event.event_date);
      return isSameMonth(eventDate, currentMonth);
    });
  }, [filteredEvents, currentMonth]);

  const goToPrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mb-8 animate-fade-in flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Calendar</h1>
            <p className="text-muted-foreground">View your scheduled events</p>
          </div>
          <Link to="/create-event">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>

        {/* Priority Filter */}
        <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <PriorityFilter value={priorityFilter} onChange={setPriorityFilter} />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar Grid */}
          <Card className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                >
                  Today
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map((day) => (
                  <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Days */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                
                {/* Day cells */}
                {calendarDays.map((day) => {
                  const dayEvents = getEventsForDay(day);
                  const today = isToday(day);
                  
                  return (
                    <Tooltip key={day.toISOString()}>
                      <TooltipTrigger asChild>
                        <div
                          className={`aspect-square p-1 rounded-lg transition-colors hover:bg-secondary/50 cursor-pointer ${
                            today ? "bg-primary/10 ring-1 ring-primary/20" : ""
                          }`}
                        >
                          <div className="h-full flex flex-col">
                            <span className={`text-sm ${today ? "font-bold text-primary" : ""}`}>
                              {format(day, "d")}
                            </span>
                            {dayEvents.length > 0 && (
                              <div className="flex flex-wrap gap-0.5 mt-1">
                                {dayEvents.slice(0, 3).map((event) => (
                                  <div
                                    key={event.id}
                                    className={`h-1.5 w-1.5 rounded-full ${getPriorityColor(event.priority)}`}
                                  />
                                ))}
                                {dayEvents.length > 3 && (
                                  <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipTrigger>
                      {dayEvents.length > 0 && (
                        <TooltipContent side="bottom" className="max-w-xs">
                          <div className="space-y-1">
                            {dayEvents.map((event) => (
                              <div key={event.id} className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${getPriorityColor(event.priority)}`} />
                                <span className="text-sm">{event.title}</span>
                                <span className="text-xs text-muted-foreground">{event.event_time.slice(0, 5)}</span>
                              </div>
                            ))}
                          </div>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-border flex items-center gap-6 justify-center">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-priority-low" />
                  <span className="text-sm text-muted-foreground">Low</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-priority-medium" />
                  <span className="text-sm text-muted-foreground">Medium</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-priority-high" />
                  <span className="text-sm text-muted-foreground">High</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Month's Events Sidebar */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle className="text-lg">This Month</CardTitle>
            </CardHeader>
            <CardContent>
              {monthEvents.length > 0 ? (
                <div className="space-y-3">
                  {monthEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className={`h-2 w-2 rounded-full mt-1.5 ${getPriorityColor(event.priority)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(event.event_date), "EEE, MMM d")} at {event.event_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">No events this month</p>
                  <Link to="/create-event" className="mt-3">
                    <Button variant="outline" size="sm">
                      Create one
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
