import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  useRealtimeNotifications();
  return <>{children}</>;
}
