import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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

interface Attachment {
  name: string;
  url: string;
}

interface ShareMinutesRequest {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  minutesContent: string;
  attachments?: Attachment[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT token
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the JWT and get user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { eventId, eventTitle, eventDate, minutesContent, attachments }: ShareMinutesRequest = await req.json();

    if (!eventId || !eventTitle || !minutesContent) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get event to verify user has access
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, creator_id")
      .eq("id", eventId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: "Event not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get sender's profile
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("name, email")
      .eq("user_id", user.id)
      .single();

    const senderName = senderProfile?.name || "A team member";

    // Get all participants (creator + confirmed attendees)
    const recipientEmails: string[] = [];

    // Get creator's email
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("email")
      .eq("user_id", event.creator_id)
      .single();

    if (creatorProfile?.email) {
      recipientEmails.push(creatorProfile.email);
    }

    // Get confirmed attendees' emails
    const { data: responses } = await supabase
      .from("event_responses")
      .select("user_id")
      .eq("event_id", eventId)
      .eq("response", "yes");

    if (responses) {
      for (const response of responses) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", response.user_id)
          .single();

        if (profile?.email && !recipientEmails.includes(profile.email)) {
          recipientEmails.push(profile.email);
        }
      }
    }

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No participants found to share with" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format minutes content for HTML (preserve line breaks)
    const formattedMinutes = escapeHtml(minutesContent).replace(/\n/g, "<br>");

    // Build attachments HTML section
    let attachmentsHtml = "";
    if (attachments && attachments.length > 0) {
      attachmentsHtml = `
        <div style="background: #fff; border: 1px solid #e5e5e5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">📎 Attachments (${attachments.length})</h3>
          <ul style="margin: 0; padding: 0 0 0 20px;">
            ${attachments.map(att => `
              <li style="margin: 8px 0;">
                <a href="${escapeHtml(att.url)}" target="_blank" rel="noopener noreferrer" style="color: #4287f5; text-decoration: none;">
                  ${escapeHtml(att.name)}
                </a>
              </li>
            `).join("")}
          </ul>
        </div>
      `;
    }

    // Send email to all participants
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SyncMates <onboarding@resend.dev>",
        to: recipientEmails,
        subject: `Meeting Minutes: ${escapeHtml(eventTitle)}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">Meeting Minutes</h1>
            <p style="color: #666;">Shared by ${escapeHtml(senderName)}</p>
            
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h2 style="margin: 0 0 10px 0; color: #333;">${escapeHtml(eventTitle)}</h2>
              <p style="margin: 0; color: #666;">
                📅 ${eventDate}
              </p>
            </div>
            
            <div style="background: #fff; border: 1px solid #e5e5e5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin: 0 0 15px 0; color: #333;">Minutes</h3>
              <div style="color: #444; line-height: 1.6;">
                ${formattedMinutes}
              </div>
            </div>
            
            ${attachmentsHtml}
            
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              This email was sent via SyncMates. You are receiving this because you are a participant of this event.
            </p>
          </div>
        `,
      }),
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Failed to send email:", result);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: result }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Meeting minutes shared for event ${eventId} to ${recipientEmails.length} recipients with ${attachments?.length || 0} attachments`);

    return new Response(
      JSON.stringify({
        success: true,
        recipientCount: recipientEmails.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in share-meeting-minutes function:", error);
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
