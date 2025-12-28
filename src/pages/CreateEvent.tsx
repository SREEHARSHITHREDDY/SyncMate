import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Flag, ArrowRight } from "lucide-react";

export default function CreateEvent() {
  return (
    <AppLayout isAuthenticated={true}>
      <div className="container py-8 max-w-2xl">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-semibold mb-2">Create Event</h1>
          <p className="text-muted-foreground">Plan something fun with your friends</p>
        </div>

        <Card className="shadow-soft animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
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
              <Input id="title" placeholder="Coffee catch-up, Movie night, etc." />
            </div>

            {/* Date & Time */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date
                </Label>
                <Input id="date" type="date" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Time
                </Label>
                <Input id="time" type="time" />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea 
                id="description" 
                placeholder="Add any extra details about the event..."
                rows={3}
              />
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                Priority
              </Label>
              <div className="flex gap-2">
                {["Low", "Medium", "High"].map((priority) => (
                  <Button
                    key={priority}
                    variant="outline"
                    size="sm"
                    className={`flex-1 ${
                      priority === "Medium" ? "border-primary bg-primary/5 text-primary" : ""
                    }`}
                  >
                    {priority}
                  </Button>
                ))}
              </div>
            </div>

            {/* Invite Friends */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Invite Friends
              </Label>
              <div className="space-y-2 p-4 rounded-lg bg-secondary/50">
                {[
                  { name: "Alex Rivera", selected: true },
                  { name: "Emma Wilson", selected: false },
                  { name: "James Park", selected: true },
                ].map((friend, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      defaultChecked={friend.selected}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span className={friend.selected ? "text-foreground" : "text-muted-foreground"}>
                      {friend.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Button className="w-full gap-2" size="lg">
              Create Event
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
