import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, Clock, CalendarDays, Mail, Loader2, Smartphone } from "lucide-react";
import { useNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function NotificationPreferencesCard() {
  const { preferences, preferencesLoading, updatePreferences, isUpdating } = useNotificationPreferences();
  const { 
    isSupported: pushSupported, 
    permission, 
    isSubscribed, 
    enablePush, 
    disablePush,
    isEnabling,
    isDisabling 
  } = usePushNotifications();
  
  const [remind1Hour, setRemind1Hour] = useState(true);
  const [remind1Day, setRemind1Day] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  useEffect(() => {
    if (preferences) {
      setRemind1Hour(preferences.remind_1_hour);
      setRemind1Day(preferences.remind_1_day);
      setEmailEnabled(preferences.email_enabled);
    }
  }, [preferences]);

  const handleUpdate = async (field: string, value: boolean) => {
    try {
      await updatePreferences({ [field]: value });
      toast.success("Preferences updated");
    } catch (error: any) {
      toast.error(error.message || "Failed to update preferences");
    }
  };

  if (preferencesLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose when and how you want to be reminded about upcoming events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <Label htmlFor="email-enabled" className="font-medium">
                Email Notifications
              </Label>
              <p className="text-sm text-muted-foreground">
                Receive reminders via email
              </p>
            </div>
          </div>
          <Switch
            id="email-enabled"
            checked={emailEnabled}
            onCheckedChange={(checked) => {
              setEmailEnabled(checked);
              handleUpdate("email_enabled", checked);
            }}
            disabled={isUpdating}
          />
        </div>

        {/* Push Notifications */}
        {pushSupported && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-accent" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="push-enabled" className="font-medium">
                    Push Notifications
                  </Label>
                  {permission === 'denied' && (
                    <Badge variant="destructive" className="text-xs">Blocked</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Receive browser push notifications
                </p>
              </div>
            </div>
            <Switch
              id="push-enabled"
              checked={isSubscribed}
              onCheckedChange={async (checked) => {
                try {
                  if (checked) {
                    await enablePush();
                    toast.success("Push notifications enabled");
                  } else {
                    await disablePush();
                    toast.success("Push notifications disabled");
                  }
                } catch (error: any) {
                  toast.error(error.message || "Failed to update push notifications");
                }
              }}
              disabled={isEnabling || isDisabling || permission === 'denied'}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <Label htmlFor="remind-1-hour" className="font-medium">
                1 Hour Before
              </Label>
              <p className="text-sm text-muted-foreground">
                Get reminded 1 hour before events
              </p>
            </div>
          </div>
          <Switch
            id="remind-1-hour"
            checked={remind1Hour}
            onCheckedChange={(checked) => {
              setRemind1Hour(checked);
              handleUpdate("remind_1_hour", checked);
            }}
            disabled={isUpdating || !emailEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
              <CalendarDays className="h-5 w-5 text-info" />
            </div>
            <div>
              <Label htmlFor="remind-1-day" className="font-medium">
                1 Day Before
              </Label>
              <p className="text-sm text-muted-foreground">
                Get reminded 1 day before events
              </p>
            </div>
          </div>
          <Switch
            id="remind-1-day"
            checked={remind1Day}
            onCheckedChange={(checked) => {
              setRemind1Day(checked);
              handleUpdate("remind_1_day", checked);
            }}
            disabled={isUpdating || !emailEnabled}
          />
        </div>
      </CardContent>
    </Card>
  );
}
