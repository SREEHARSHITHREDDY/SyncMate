import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, UserPlus, Calendar, Check, CheckCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

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
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { notifications, notificationsLoading, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id);
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  return (
    <AppLayout>
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
            <Button variant="outline" size="sm" className="gap-2" onClick={handleMarkAllAsRead}>
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
          <CardContent>
            {notificationsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex gap-4 py-4 first:pt-0 last:pb-0 cursor-pointer transition-colors ${
                      !notification.is_read ? "bg-primary/5 -mx-6 px-6" : ""
                    }`}
                    onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={`font-medium ${
                              !notification.is_read ? "text-foreground" : "text-muted-foreground"
                            }`}
                          >
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground">{notification.message}</p>
                        </div>
                        {!notification.is_read && (
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse-soft" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Bell className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
                <p className="text-muted-foreground max-w-sm">
                  When you get friend requests or event invites, they'll show up here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
