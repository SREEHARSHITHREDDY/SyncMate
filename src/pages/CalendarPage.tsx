import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MOCK_EVENTS = [
  { day: 5, title: "Coffee with Alex", priority: "low" },
  { day: 12, title: "Team Dinner", priority: "medium" },
  { day: 18, title: "Movie Night", priority: "high" },
  { day: 25, title: "Birthday Party", priority: "medium" },
];

export default function CalendarPage() {
  const today = new Date();
  const currentMonth = today.toLocaleString("default", { month: "long", year: "numeric" });
  
  // Generate days for current month (simplified)
  const daysInMonth = 31;
  const firstDayOfWeek = 0; // Sunday

  return (
    <AppLayout isAuthenticated={true}>
      <div className="container py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-semibold mb-2">Calendar</h1>
          <p className="text-muted-foreground">View your scheduled events</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar Grid */}
          <Card className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{currentMonth}</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" className="h-8 w-8">
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
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const event = MOCK_EVENTS.find((e) => e.day === day);
                  const isToday = day === today.getDate();
                  
                  return (
                    <div
                      key={day}
                      className={`aspect-square p-1 rounded-lg transition-colors hover:bg-secondary/50 ${
                        isToday ? "bg-primary/10 ring-1 ring-primary/20" : ""
                      }`}
                    >
                      <div className="h-full flex flex-col">
                        <span className={`text-sm ${isToday ? "font-bold text-primary" : ""}`}>
                          {day}
                        </span>
                        {event && (
                          <div
                            className={`mt-auto text-xs truncate px-1 py-0.5 rounded ${
                              event.priority === "low"
                                ? "bg-priority-low/20 text-priority-low"
                                : event.priority === "medium"
                                ? "bg-priority-medium/20 text-priority-medium"
                                : "bg-priority-high/20 text-priority-high"
                            }`}
                          >
                            {event.title}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events Sidebar */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle className="text-lg">This Month</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_EVENTS.map((event, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      event.priority === "low"
                        ? "bg-priority-low"
                        : event.priority === "medium"
                        ? "bg-priority-medium"
                        : "bg-priority-high"
                    }`}
                  />
                  <div>
                    <p className="font-medium text-sm">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {currentMonth.split(" ")[0]} {event.day}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
