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

    // ==========================================
    // ACTION ITEM DUE DATE REMINDERS
    // ==========================================
    
    // Get action items due within the next 24 hours that haven't had reminders sent
    const { data: upcomingActionItems, error: actionItemsError } = await supabase
      .from("action_items")
      .select("*")
      .eq("is_completed", false)
      .eq("reminder_sent", false)
      .not("due_date", "is", null)
      .lte("due_date", oneDayLater.toISOString())
      .gte("due_date", now.toISOString());

    if (actionItemsError) {
      console.error("Error fetching action items:", actionItemsError);
    }

    const actionItemRemindersSent: string[] = [];

    if (upcomingActionItems && upcomingActionItems.length > 0) {
      for (const actionItem of upcomingActionItems) {
        // Only send to assignee if there is one
        if (!actionItem.assignee_id) continue;

        // Get assignee's profile
        const { data: assigneeProfile } = await supabase
          .from("profiles")
          .select("email, name, user_id")
          .eq("user_id", actionItem.assignee_id)
          .maybeSingle();

        if (!assigneeProfile?.email) continue;

        // Get user's notification preferences
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", actionItem.assignee_id)
          .maybeSingle();

        const emailEnabled = prefs?.email_enabled ?? true;

        if (!emailEnabled) {
          console.log(`Skipping action item reminder for ${assigneeProfile.email}: email disabled`);
          continue;
        }

        // Get event title for context
        const { data: event } = await supabase
          .from("events")
          .select("title")
          .eq("id", actionItem.event_id)
          .single();

        const eventTitle = event?.title || "an event";
        const dueDate = new Date(actionItem.due_date);
        const formattedDueDate = dueDate.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Calculate time until due
        const hoursUntilDue = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        let timeUntilDue = "";
        if (hoursUntilDue <= 1) {
          timeUntilDue = "less than an hour";
        } else if (hoursUntilDue < 24) {
          timeUntilDue = `${hoursUntilDue} hours`;
        } else {
          timeUntilDue = "tomorrow";
        }

        try {
          // Send email reminder
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Action Item Reminder <onboarding@resend.dev>",
              to: [assigneeProfile.email],
              subject: `⏰ Action item due in ${timeUntilDue}: ${escapeHtml(actionItem.content.substring(0, 50))}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #333;">Action Item Reminder</h1>
                  <p>Hi ${escapeHtml(assigneeProfile.name || "there")}!</p>
                  <p>You have an action item due in <strong>${timeUntilDue}</strong>:</p>
                  <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                    <p style="margin: 0 0 10px 0; font-weight: bold; color: #333;">📋 ${escapeHtml(actionItem.content)}</p>
                    <p style="margin: 0; color: #666; font-size: 14px;">
                      From meeting: ${escapeHtml(eventTitle)}
                    </p>
                    <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
                      📅 Due: ${formattedDueDate}
                    </p>
                  </div>
                  <p style="color: #666;">Don't forget to complete this task!</p>
                </div>
              `,
            }),
          });

          const result = await emailResponse.json();
          console.log(`Action item reminder sent to ${assigneeProfile.email}:`, result);
          actionItemRemindersSent.push(assigneeProfile.email);

          // Mark reminder as sent
          await supabase
            .from("action_items")
            .update({ reminder_sent: true })
            .eq("id", actionItem.id);

          // Create in-app notification
          await supabase.from("notifications").insert({
            user_id: actionItem.assignee_id,
            type: "action_item_reminder",
            title: "Action item due soon",
            message: `"${actionItem.content.substring(0, 50)}${actionItem.content.length > 50 ? "..." : ""}" is due in ${timeUntilDue}`,
            reference_id: actionItem.event_id,
          });

        } catch (emailError) {
          console.error(`Failed to send action item reminder to ${assigneeProfile.email}:`, emailError);
        }

        // Send push notification
        try {
          const { data: pushSubs } = await supabase
            .from("push_subscriptions")
            .select("*")
            .eq("user_id", actionItem.assignee_id);

          if (pushSubs && pushSubs.length > 0) {
            for (const sub of pushSubs) {
              try {
                await fetch(sub.endpoint, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'TTL': '86400',
                  },
                  body: JSON.stringify({
                    title: `Action item due in ${timeUntilDue}`,
                    body: actionItem.content.substring(0, 100),
                    url: '/dashboard',
                  }),
                });
                console.log(`Action item push sent to ${assigneeProfile.email}`);
              } catch (pushError) {
                console.error(`Action item push failed for ${assigneeProfile.email}:`, pushError);
              }
            }
          }
        } catch (pushError) {
          console.error(`Failed to send action item push to ${assigneeProfile.email}:`, pushError);
        }
      }
    }

    // ==========================================
    // OVERDUE ACTION ITEM DAILY REMINDERS
    // ==========================================
    
    // Get overdue action items (due date in the past, not completed)
    // We'll send daily reminders for these
    const { data: overdueActionItems, error: overdueError } = await supabase
      .from("action_items")
      .select("*")
      .eq("is_completed", false)
      .not("due_date", "is", null)
      .lt("due_date", now.toISOString());

    if (overdueError) {
      console.error("Error fetching overdue action items:", overdueError);
    }

    const overdueRemindersSent: string[] = [];

    if (overdueActionItems && overdueActionItems.length > 0) {
      // Group overdue items by assignee
      const itemsByAssignee = new Map<string, typeof overdueActionItems>();
      
      for (const item of overdueActionItems) {
        if (!item.assignee_id) continue;
        
        const existing = itemsByAssignee.get(item.assignee_id) || [];
        existing.push(item);
        itemsByAssignee.set(item.assignee_id, existing);
      }

      // Send one consolidated email per assignee with all their overdue items
      for (const [assigneeId, items] of itemsByAssignee) {
        // Get assignee's profile
        const { data: assigneeProfile } = await supabase
          .from("profiles")
          .select("email, name, user_id")
          .eq("user_id", assigneeId)
          .maybeSingle();

        if (!assigneeProfile?.email) continue;

        // Get user's notification preferences
        const { data: prefs } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", assigneeId)
          .maybeSingle();

        const emailEnabled = prefs?.email_enabled ?? true;

        if (!emailEnabled) {
          console.log(`Skipping overdue reminder for ${assigneeProfile.email}: email disabled`);
          continue;
        }

        // Get event titles for context
        const eventIds = [...new Set(items.map((i) => i.event_id))];
        const { data: events } = await supabase
          .from("events")
          .select("id, title")
          .in("id", eventIds);

        const eventMap = new Map(events?.map((e) => [e.id, e.title]) || []);

        // Build the list of overdue items
        const itemsList = items.map((item) => {
          const dueDate = new Date(item.due_date);
          const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          const eventTitle = eventMap.get(item.event_id) || "an event";
          return `
            <li style="margin-bottom: 10px; padding: 10px; background: #fff; border-radius: 4px; border-left: 3px solid #dc3545;">
              <strong>${escapeHtml(item.content)}</strong>
              <br/>
              <span style="font-size: 12px; color: #666;">
                From: ${escapeHtml(eventTitle)} • 
                ${daysOverdue === 1 ? "1 day" : `${daysOverdue} days`} overdue
              </span>
            </li>
          `;
        }).join("");

        try {
          // Send consolidated overdue reminder email
          const emailResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Action Item Reminder <onboarding@resend.dev>",
              to: [assigneeProfile.email],
              subject: `⚠️ You have ${items.length} overdue action item${items.length > 1 ? "s" : ""}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                  <h1 style="color: #dc3545;">Overdue Action Items</h1>
                  <p>Hi ${escapeHtml(assigneeProfile.name || "there")}!</p>
                  <p>You have <strong>${items.length} overdue action item${items.length > 1 ? "s" : ""}</strong> that need${items.length === 1 ? "s" : ""} your attention:</p>
                  <ul style="list-style: none; padding: 0; margin: 20px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    ${itemsList}
                  </ul>
                  <p style="color: #666;">Please complete these tasks as soon as possible!</p>
                </div>
              `,
            }),
          });

          const result = await emailResponse.json();
          console.log(`Overdue reminder sent to ${assigneeProfile.email}:`, result);
          overdueRemindersSent.push(assigneeProfile.email);

          // Create in-app notification (only once per day, so we check if one was already sent today)
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);

          const { data: existingNotif } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", assigneeId)
            .eq("type", "overdue_action_items")
            .gte("created_at", startOfDay.toISOString())
            .maybeSingle();

          if (!existingNotif) {
            await supabase.from("notifications").insert({
              user_id: assigneeId,
              type: "overdue_action_items",
              title: "Overdue action items",
              message: `You have ${items.length} overdue action item${items.length > 1 ? "s" : ""} that need${items.length === 1 ? "s" : ""} attention`,
              reference_id: items[0].event_id,
            });
          }

        } catch (emailError) {
          console.error(`Failed to send overdue reminder to ${assigneeProfile.email}:`, emailError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        eventsProcessed: allEvents.length,
        emailsSent: emailsSent.length,
        actionItemReminders: actionItemRemindersSent.length,
        overdueReminders: overdueRemindersSent.length,
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
