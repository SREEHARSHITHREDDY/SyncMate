import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
// FIX 20: import the new reminder alerts hook
import { useReminderAlerts } from "@/hooks/useReminderAlerts";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeNotifications();
  // FIX 20: run reminder alerts globally — checks every 30s and fires
  // a toast + native notification when a reminder's time matches current time
  useReminderAlerts();
  return <>{children}</>;
}