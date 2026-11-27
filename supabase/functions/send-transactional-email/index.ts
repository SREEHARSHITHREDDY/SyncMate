import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

// HTML-escape to prevent XSS in email templates
function escapeHtml(unsafe: string): string {
  return (unsafe ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── Shared email shell ─────────────────────────────────────────────────────
function wrapEmail(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
  body { margin: 0; padding: 0; background: #0f0f13; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
  .wrapper { max-width: 580px; margin: 40px auto; background: #1a1a2e; border-radius: 16px; overflow: hidden; border: 1px solid rgba(99,102,241,0.2); }
  .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 40px; text-align: center; }
  .header .logo { font-size: 26px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; }
  .header .logo span { color: #c4b5fd; }
  .content { padding: 36px 40px; }
  .content h2 { margin: 0 0 12px; font-size: 22px; font-weight: 700; color: #e2e8f0; }
  .content p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #94a3b8; }
  .card { background: rgba(99,102,241,0.08); border: 1px solid rgba(99,102,241,0.2); border-radius: 12px; padding: 20px 24px; margin: 20px 0; }
  .card .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #6366f1; margin-bottom: 4px; }
  .card .value { font-size: 16px; font-weight: 600; color: #e2e8f0; }
  .btn { display: inline-block; margin-top: 8px; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600; }
  .footer { padding: 20px 40px; border-top: 1px solid rgba(99,102,241,0.15); text-align: center; }
  .footer p { font-size: 12px; color: #475569; margin: 0; line-height: 1.6; }
  .avatar { display: inline-block; width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg,#6366f1,#8b5cf6); line-height: 48px; text-align: center; font-size: 22px; color: #fff; font-weight: 700; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="logo">Sync<span>Mates</span></div>
  </div>
  <div class="content">
    ${body}
  </div>
  <div class="footer">
    <p>You're receiving this because you're a SyncMates member.<br/>
    Manage your notification preferences in <a href="https://syncmates.in/notifications" style="color:#6366f1;">SyncMates settings</a>.</p>
  </div>
</div>
</body>
</html>`;
}

// ─── Email templates ─────────────────────────────────────────────────────────

function friendRequestEmail(
  recipientName: string,
  senderName: string,
  senderAvatarLetter: string,
): string {
  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div class="avatar">${escapeHtml(senderAvatarLetter)}</div>
    </div>
    <h2>Friend Request from ${escapeHtml(senderName)} 👋</h2>
    <p>Hey ${escapeHtml(recipientName)},</p>
    <p><strong style="color:#e2e8f0;">${escapeHtml(senderName)}</strong> wants to connect with you on SyncMates — so you can coordinate schedules, plan events together, and find the best times to meet.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://syncmates.in/friends" class="btn">View Friend Request</a>
    </div>
    <p style="font-size:13px;">Once you accept, ${escapeHtml(senderName)} can see your free/busy availability when planning shared events.</p>
  `;
  return wrapEmail(`Friend Request from ${senderName}`, body);
}

function eventInviteEmail(
  recipientName: string,
  senderName: string,
  eventTitle: string,
  eventDate: string,
  eventTime: string,
  eventId: string,
): string {
  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString("en-IN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Date TBD";

  const body = `
    <h2>You're invited to an event 🎉</h2>
    <p>Hey ${escapeHtml(recipientName)},</p>
    <p><strong style="color:#e2e8f0;">${escapeHtml(senderName)}</strong> has invited you to join:</p>
    <div class="card">
      <div class="label">Event</div>
      <div class="value">${escapeHtml(eventTitle)}</div>
    </div>
    <div class="card">
      <div class="label">Date</div>
      <div class="value">${escapeHtml(formattedDate)}</div>
    </div>
    ${
      eventTime
        ? `<div class="card">
      <div class="label">Time</div>
      <div class="value">${escapeHtml(eventTime)}</div>
    </div>`
        : ""
    }
    <div style="text-align:center;margin:28px 0;">
      <a href="https://syncmates.in/calendar?event=${escapeHtml(eventId)}" class="btn">View &amp; Respond to Event</a>
    </div>
    <p style="font-size:13px;">Open SyncMates to accept or decline — ${escapeHtml(senderName)} will be notified of your response.</p>
  `;
  return wrapEmail(`You're invited: ${eventTitle}`, body);
}

function eventResponseEmail(
  recipientName: string,
  responderName: string,
  eventTitle: string,
  response: string,
  eventId: string,
): string {
  const responseLabel =
    response === "accepted"
      ? "✅ Accepted"
      : response === "declined"
      ? "❌ Declined"
      : "🤔 Maybe";

  const responseColor =
    response === "accepted"
      ? "#22c55e"
      : response === "declined"
      ? "#ef4444"
      : "#f59e0b";

  const body = `
    <h2>RSVP Update for ${escapeHtml(eventTitle)}</h2>
    <p>Hey ${escapeHtml(recipientName)},</p>
    <p><strong style="color:#e2e8f0;">${escapeHtml(responderName)}</strong> has responded to your event:</p>
    <div class="card" style="text-align:center;">
      <div class="label">${escapeHtml(eventTitle)}</div>
      <div class="value" style="color:${responseColor};font-size:20px;">${responseLabel}</div>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://syncmates.in/calendar?event=${escapeHtml(eventId)}" class="btn">View Event Details</a>
    </div>
  `;
  return wrapEmail(`RSVP Update: ${eventTitle}`, body);
}

// ─── Send email via Resend ────────────────────────────────────────────────────

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY not set — email not sent");
    return false;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "SyncMates <notifications@syncmates.in>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Resend error:", res.status, err);
    return false;
  }

  const data = await res.json();
  console.log("Email sent:", data.id, "→", to);
  return true;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Webhook payload type:", payload?.type, "table:", payload?.table);

    // Supabase Database Webhook sends { type, table, record, old_record }
    const record = payload?.record;

    if (!record) {
      return new Response(JSON.stringify({ error: "No record in payload" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Only handle INSERT events on the notifications table
    if (payload?.type !== "INSERT") {
      return new Response(JSON.stringify({ skipped: "not an INSERT" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const notificationType: string = record.type ?? "";
    const userId: string = record.user_id ?? "";
    const relatedUserId: string = record.related_user_id ?? "";
    const relatedEntityId: string = record.related_entity_id ?? "";

    // Types we handle with transactional emails
    const handled = ["friend_request", "event_invite", "event_response"];
    if (!handled.includes(notificationType)) {
      console.log("Notification type not handled:", notificationType);
      return new Response(JSON.stringify({ skipped: `type ${notificationType} not handled` }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ── Fetch recipient (the user who gets this notification) ──────────────
    const { data: recipient, error: recipientErr } = await supabase
      .from("profiles")
      .select("id, name, email")
      .eq("id", userId)
      .single();

    if (recipientErr || !recipient) {
      console.error("Recipient not found:", recipientErr);
      return new Response(JSON.stringify({ error: "Recipient not found" }), {
        status: 200, // 200 so webhook doesn't retry infinitely
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!recipient.email) {
      console.log("Recipient has no email, skipping");
      return new Response(JSON.stringify({ skipped: "no email" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ── Check notification preferences ────────────────────────────────────
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_enabled")
      .eq("user_id", userId)
      .single();

    // Default to true if no preference row yet
    if (prefs && prefs.email_enabled === false) {
      console.log("User has email notifications disabled:", userId);
      return new Response(JSON.stringify({ skipped: "email_enabled=false" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ── Fetch sender profile ───────────────────────────────────────────────
    let senderName = "Someone";
    let senderAvatarLetter = "S";

    if (relatedUserId) {
      const { data: sender } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", relatedUserId)
        .single();

      if (sender?.name) {
        senderName = sender.name;
        senderAvatarLetter = sender.name.charAt(0).toUpperCase();
      }
    }

    const recipientName = recipient.name ?? "there";

    // ── Handle each notification type ─────────────────────────────────────

    if (notificationType === "friend_request") {
      const html = friendRequestEmail(recipientName, senderName, senderAvatarLetter);
      await sendEmail(
        recipient.email,
        `${senderName} sent you a friend request on SyncMates`,
        html,
      );
    }

    else if (notificationType === "event_invite") {
      // Fetch event details
      const { data: event } = await supabase
        .from("events")
        .select("id, title, event_date, event_time")
        .eq("id", relatedEntityId)
        .single();

      const eventTitle = event?.title ?? "an event";
      const eventDate = event?.event_date ?? "";
      const eventTime = event?.event_time ?? "";
      const eventId = event?.id ?? relatedEntityId;

      const html = eventInviteEmail(
        recipientName,
        senderName,
        eventTitle,
        eventDate,
        eventTime,
        eventId,
      );
      await sendEmail(
        recipient.email,
        `${senderName} invited you to "${eventTitle}"`,
        html,
      );
    }

    else if (notificationType === "event_response") {
      // relatedEntityId = event_id, record.message contains the response
      // Try to parse response from the notification message
      const message: string = record.message ?? "";
      let response = "responded";
      if (message.toLowerCase().includes("accepted")) response = "accepted";
      else if (message.toLowerCase().includes("declined")) response = "declined";
      else if (message.toLowerCase().includes("maybe")) response = "maybe";

      const { data: event } = await supabase
        .from("events")
        .select("id, title")
        .eq("id", relatedEntityId)
        .single();

      const eventTitle = event?.title ?? "your event";
      const eventId = event?.id ?? relatedEntityId;

      const html = eventResponseEmail(
        recipientName,
        senderName,
        eventTitle,
        response,
        eventId,
      );
      await sendEmail(
        recipient.email,
        `${senderName} ${response} your event "${eventTitle}"`,
        html,
      );
    }

    return new Response(
      JSON.stringify({ success: true, type: notificationType }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
