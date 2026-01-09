import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// HTML escape function to prevent XSS in email templates
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface EventReminder {
  event_id: string;
  event_title: string;
  event_date: string;
  event_time: string;
  user_email: string;
  user_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify cron secret for authentication
  const authHeader = req.headers.get("authorization");
  const providedSecret = authHeader?.replace("Bearer ", "");

  if (!CRON_SECRET || !providedSecret || providedSecret !== CRON_SECRET) {
    console.error("Unauthorized: Invalid or missing cron secret");
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    const oneDayLater = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Format dates for comparison
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowStr = oneDayLater.toISOString().split("T")[0];
    
    // Get current time in HH:MM format
    const currentHour = now.getHours().toString().padStart(2, "0");
    const currentMinute = now.getMinutes().toString().padStart(2, "0");
    const oneHourLaterHour = oneHourLater.getHours().toString().padStart(2, "0");
    const oneHourLaterMinute = oneHourLater.getMinutes().toString().padStart(2, "0");

    // Get events happening in the next hour (for 1-hour reminder)
    const { data: hourEvents, error: hourError } = await supabase
      .from("events")
      .select(`
        id,
        title,
        event_date,
        event_time,
        creator_id
      `)
      .eq("event_date", todayStr)
      .gte("event_time", `${currentHour}:${currentMinute}`)
      .lte("event_time", `${oneHourLaterHour}:${oneHourLaterMinute}`);

    if (hourError) {
      console.error("Error fetching hour events:", hourError);
    }

    // Get events happening tomorrow at this time (for 1-day reminder)
    const { data: dayEvents, error: dayError } = await supabase
      .from("events")
      .select(`
        id,
        title,
        event_date,
        event_time,
        creator_id
      `)
      .eq("event_date", tomorrowStr)
      .gte("event_time", `${currentHour}:${currentMinute}`)
      .lte("event_time", `${oneHourLaterHour}:${oneHourLaterMinute}`);

    if (dayError) {
      console.error("Error fetching day events:", dayError);
    }

    const allEvents = [...(hourEvents || []), ...(dayEvents || [])];
    const emailsSent: string[] = [];

    for (const event of allEvents) {
      // Determine reminder type
      const isHourReminder = event.event_date === todayStr;
      const reminderType = isHourReminder ? "1 hour" : "1 day";

      // Get creator's profile and preferences
      const { data: creatorProfile } = await supabase
        .from("profiles")
        .select("email, name, user_id")
        .eq("user_id", event.creator_id)
        .maybeSingle();

      // Get all invitees
      const { data: responses } = await supabase
        .from("event_responses")
        .select("user_id, response")
        .eq("event_id", event.id)
        .eq("response", "yes");

      const usersToNotify: { email: string; name: string; userId: string }[] = [];

      // Add creator
      if (creatorProfile?.email) {
        usersToNotify.push({
          email: creatorProfile.email,
          name: creatorProfile.name || "there",
          userId: creatorProfile.user_id,
        });
      }

      // Add accepted invitees
      if (responses) {
        for (const response of responses) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, name, user_id")
            .eq("user_id", response.user_id)
            .maybeSingle();

          if (profile?.email) {
            usersToNotify.push({
              email: profile.email,
              name: profile.name || "there",
              userId: profile.user_id,
            });
          }
        }
      }

      // Filter users based on their notification preferences
      for (const user of usersToNotify) {
        // Get user's notification preferences
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.userId)
          .maybeSingle();

        // Default: send both reminders if no preferences set
        const emailEnabled = prefs?.email_enabled ?? true;
        const remind1Hour = prefs?.remind_1_hour ?? true;
        const remind1Day = prefs?.remind_1_day ?? true;

        // Skip if email is disabled
        if (!emailEnabled) {
          console.log(`Skipping ${user.email}: email notifications disabled`);
          continue;
        }

        // Skip based on reminder timing preference
        if (isHourReminder && !remind1Hour) {
          console.log(`Skipping ${user.email}: 1-hour reminders disabled`);
          continue;
        }
        if (!isHourReminder && !remind1Day) {
          console.log(`Skipping ${user.email}: 1-day reminders disabled`);
          continue;
        }

        // Send email if enabled
        if (emailEnabled) {
          try {
            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "Event Reminder <onboarding@resend.dev>",
                to: [user.email],
                subject: `Reminder: ${escapeHtml(event.title)} in ${reminderType}`,
                html: `
                  <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #333;">Event Reminder</h1>
                    <p>Hi ${escapeHtml(user.name)}!</p>
                    <p>This is a friendly reminder that you have an event coming up in <strong>${reminderType}</strong>:</p>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h2 style="margin: 0 0 10px 0; color: #333;">${escapeHtml(event.title)}</h2>
                      <p style="margin: 0; color: #666;">
                        📅 ${new Date(event.event_date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                      <p style="margin: 5px 0 0 0; color: #666;">
                        🕐 ${event.event_time.slice(0, 5)}
                      </p>
                    </div>
                    <p style="color: #666;">Don't forget to be there!</p>
                  </div>
                `,
              }),
            });

            const result = await emailResponse.json();
            console.log(`Email sent to ${user.email}:`, result);
            emailsSent.push(user.email);
          } catch (emailError) {
            console.error(`Failed to send email to ${user.email}:`, emailError);
          }
        }

        // Send push notification
        try {
          const { data: pushSubs } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", user.userId);

          if (pushSubs && pushSubs.length > 0) {
            for (const sub of pushSubs) {
              try {
                // Simple push notification via native fetch
                await fetch(sub.endpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'TTL': '86400',
                  },
                  body: JSON.stringify({
                    title: `${event.title} in ${reminderType}`,
                    body: `Don't forget: ${event.title} on ${new Date(event.event_date).toLocaleDateString()}`,
                    url: '/dashboard',
                  }),
                });
                console.log(`Push sent to ${user.email}`);
              } catch (pushError) {
                console.error(`Push failed for ${user.email}:`, pushError);
              }
            }
          }
        } catch (pushError) {
          console.error(`Failed to send push to ${user.email}:`, pushError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventsProcessed: allEvents.length,
        emailsSent: emailsSent.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-event-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
