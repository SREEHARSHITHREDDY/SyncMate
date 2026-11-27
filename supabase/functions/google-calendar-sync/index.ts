import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Refresh Google access token using the stored refresh token
async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Token refresh failed: ${err}`);
  }
  return res.json();
}

// Get a valid access token, refreshing if expired
async function getValidToken(supabase: any, userId: string): Promise<string> {
  const { data: tokenRow, error } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !tokenRow) throw new Error("Google Calendar not connected");

  const expiresAt = new Date(tokenRow.expires_at);
  const now = new Date();

  // Refresh if token expires within 5 minutes
  if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
    const refreshed = await refreshAccessToken(tokenRow.refresh_token);
    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

    await supabase.from("google_calendar_tokens").update({
      access_token: refreshed.access_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    }).eq("user_id", userId);

    return refreshed.access_token;
  }

  return tokenRow.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Verify the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── OAuth callback: exchange code for tokens ──────────────────────────────
    if (action === "oauth-callback") {
      const { code, redirect_uri } = await req.json();
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.text();
        throw new Error(`OAuth exchange failed: ${err}`);
      }

      const tokens = await tokenRes.json();
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      await supabase.from("google_calendar_tokens").upsert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: expiresAt,
        scope: tokens.scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Check connection status ───────────────────────────────────────────────
    if (action === "status") {
      const { data } = await supabase
        .from("google_calendar_tokens")
        .select("id, scope, updated_at")
        .eq("user_id", user.id)
        .single();

      return new Response(JSON.stringify({ connected: !!data, updatedAt: data?.updated_at }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Disconnect ────────────────────────────────────────────────────────────
    if (action === "disconnect") {
      await supabase.from("google_calendar_tokens").delete().eq("user_id", user.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Push a SyncMates event to Google Calendar ─────────────────────────────
    if (action === "push-event") {
      const { eventId } = await req.json();
      const accessToken = await getValidToken(supabase, user.id);

      const { data: event, error: evErr } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .eq("creator_id", user.id)
        .single();

      if (evErr || !event) throw new Error("Event not found");

      // Build Google Calendar event body
      const startDateTime = `${event.event_date}T${event.event_time}`;
      const endDateTime = event.end_time
        ? `${event.event_date}T${event.end_time}`
        : `${event.event_date}T${event.event_time}`; // same time if no end

      const gcalBody = {
        summary: event.title,
        description: event.description || "",
        location: event.location || "",
        start: { dateTime: startDateTime, timeZone: "Asia/Kolkata" },
        end: { dateTime: endDateTime, timeZone: "Asia/Kolkata" },
        colorId: "7", // teal — matches SyncMates brand
      };

      let gcalRes;
      if (event.google_calendar_event_id) {
        // Update existing
        gcalRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.google_calendar_event_id}`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(gcalBody),
          }
        );
      } else {
        // Create new
        gcalRes = await fetch(
          "https://www.googleapis.com/calendar/v3/calendars/primary/events",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(gcalBody),
          }
        );
      }

      if (!gcalRes.ok) {
        const err = await gcalRes.text();
        throw new Error(`Google Calendar API error: ${err}`);
      }

      const gcalEvent = await gcalRes.json();

      // Save Google event ID back to our DB
      await supabase.from("events").update({
        google_calendar_event_id: gcalEvent.id,
        google_calendar_synced_at: new Date().toISOString(),
      }).eq("id", eventId);

      return new Response(JSON.stringify({ success: true, googleEventId: gcalEvent.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Pull busy times from Google Calendar (for Find Time page) ─────────────
    if (action === "get-busy") {
      const { timeMin, timeMax } = await req.json();
      const accessToken = await getValidToken(supabase, user.id);

      const freebusyRes = await fetch(
        "https://www.googleapis.com/calendar/v3/freeBusy",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timeMin,
            timeMax,
            items: [{ id: "primary" }],
          }),
        }
      );

      if (!freebusyRes.ok) {
        const err = await freebusyRes.text();
        throw new Error(`FreeBusy API error: ${err}`);
      }

      const freebusyData = await freebusyRes.json();
      const busy = freebusyData.calendars?.primary?.busy || [];

      return new Response(JSON.stringify({ busy }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("google-calendar-sync error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
