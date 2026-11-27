import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";
const REDIRECT_URI = `${window.location.origin}/settings`;

function buildOAuthUrl() {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

async function callSync(action: string, body?: object) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-calendar-sync?action=${action}`;
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

export function useGoogleCalendar() {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const checkStatus = useCallback(async () => {
    try {
      const data = await callSync("status");
      setConnected(data.connected);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle OAuth callback — code in URL after Google redirects back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      checkStatus();
      return;
    }

    // Clear the code from URL immediately
    window.history.replaceState({}, "", window.location.pathname);

    (async () => {
      try {
        await callSync("oauth-callback", { code, redirect_uri: REDIRECT_URI });
        setConnected(true);
        toast.success("Google Calendar connected!");
      } catch (err: any) {
        toast.error(`Failed to connect: ${err.message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const connect = () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.error("Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to your .env");
      return;
    }
    window.location.href = buildOAuthUrl();
  };

  const disconnect = async () => {
    try {
      await callSync("disconnect");
      setConnected(false);
      toast.success("Google Calendar disconnected");
    } catch (err: any) {
      toast.error(`Failed to disconnect: ${err.message}`);
    }
  };

  const pushEvent = async (eventId: string) => {
    setSyncing(true);
    try {
      await callSync("push-event", { eventId });
      toast.success("Event synced to Google Calendar!");
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const getBusyTimes = async (timeMin: string, timeMax: string) => {
    const data = await callSync("get-busy", { timeMin, timeMax });
    return data.busy as { start: string; end: string }[];
  };

  return { connected, loading, syncing, connect, disconnect, pushEvent, getBusyTimes };
}
