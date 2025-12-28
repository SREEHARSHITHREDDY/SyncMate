import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, UserPlus, Calendar, Check, CheckCheck } from "lucide-react";

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: "friend_request",
    title: "New friend request",
    message: "Sarah Johnson wants to connect with you",
    time: "5 minutes ago",
    read: false,
  },
  {
    id: 2,
    type: "event_invite",
    title: "Event invitation",
    message: "Alex invited you to 'Coffee catch-up'",
    time: "1 hour ago",
    read: false,
  },
  {
    id: 3,
    type: "event_response",
    title: "Response received",
    message: "Emma accepted your 'Movie Night' invite",
    time: "3 hours ago",
    read: true,
  },
  {
    id: 4,
    type: "event_invite",
    title: "Event invitation",
    message: "James invited you to 'Team Dinner'",
    time: "Yesterday",
    read: true,
  },
];

const getIcon = (type: string) => {
  switch (type) {
    case "friend_request":
      return <UserPlus className="h-5 w-5 text-accent" />;
    case "event_invite":
      return <Calendar className="h-5 w-5 text-primary" />;
    case "event_response":
      return <Check className="h-5 w-5 text-success" />;
    default:
      return <Bell className="h-5 w-5 text-muted-foreground" />;
  }
};

export default function Notifications() {
  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <AppLayout isAuthenticated={true}>
      <div className="container py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-semibold mb-2">Notifications</h1>
            <p className="text-muted-foreground">
              {unreadCount > 0
                ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "You're all caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2">
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          )}
        </div>

        <Card className="shadow-soft animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <CardDescription>Stay updated on your connections and events</CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {MOCK_NOTIFICATIONS.map((notification) => (
              <div
                key={notification.id}
                className={`flex gap-4 py-4 first:pt-0 last:pb-0 ${
                  !notification.read ? "bg-primary/5 -mx-6 px-6" : ""
                }`}
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className={`font-medium ${!notification.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </div>
                    {!notification.read && (
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
