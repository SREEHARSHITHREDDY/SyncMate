import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { format } from "date-fns";

interface ReminderItem {
  id: string;
  content: string;
  reminder_time: string | null;
  due_date: string | null;
}

export function useReminderAlerts() {
  const { user } = useAuth();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const checkReminders = async () => {
      const now = new Date();
      const todayStr = format(now, "yyyy-MM-dd");
      const currentTime = format(now, "HH:mm");

      try {
        // Cast to any first to avoid Supabase generated type errors
        // on new columns (item_type, reminder_time) that were added by migration
        const { data, error } = await (supabase as any)
          .from("action_items")
          .select("id, content, reminder_time, due_date")
          .eq("assignee_id", user.id)
          .eq("is_completed", false)
          .eq("item_type", "reminder")
          .eq("due_date", todayStr)
          .not("reminder_time", "is", null);

        if (error || !data) return;

        (data as ReminderItem[]).forEach((item) => {
          if (!item.reminder_time) return;
          if (firedRef.current.has(item.id)) return;

          const reminderHHMM = item.reminder_time.slice(0, 5);

          if (reminderHHMM === currentTime) {
            firedRef.current.add(item.id);

            toast(`⏰ Reminder: ${item.content}`, {
              description: `Scheduled for ${reminderHHMM}`,
              duration: 10000,
            });

            if (
              typeof window !== "undefined" &&
              "Notification" in window &&
              Notification.permission === "granted"
            ) {
              try {
                new Notification("SyncMates Reminder", {
                  body: item.content,
                  icon: "/favicon.ico",
                });
              } catch {
                // silently ignore if native notification fails
              }
            }
          }
        });
      } catch (err) {
        console.error("Reminder check failed:", err);
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30 * 1000);

    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const midnightTimeout = setTimeout(() => {
      firedRef.current.clear();
    }, midnight.getTime() - now.getTime());

    return () => {
      clearInterval(interval);
      clearTimeout(midnightTimeout);
    };
  }, [user]);
}