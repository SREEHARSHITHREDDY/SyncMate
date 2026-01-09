import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

interface ParseEventResult {
  title: string;
  date: string; // ISO format YYYY-MM-DD
  time: string; // HH:MM format
  priority: "low" | "medium" | "high";
  description?: string;
  invitees?: string[]; // Names of people to invite
}

interface SearchResult {
  relevantEvents: Array<{
    id: string;
    title: string;
    event_date: string;
    event_time: string;
    description: string | null;
    relevanceReason: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const userId = userData.user.id;
    const { action, message, events } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (action === "parse") {
      // Parse natural language to event details
      const currentDate = new Date().toISOString().split("T")[0];
      const currentDayOfWeek = new Date().toLocaleDateString("en-US", { weekday: "long" });

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant that extracts event details from natural language. 
Today's date is ${currentDate} (${currentDayOfWeek}).

Extract the following from the user's message:
- title: A concise event title
- date: The date in YYYY-MM-DD format (interpret relative dates like "next Tuesday", "tomorrow", etc.)
- time: The time in HH:MM 24-hour format (e.g., "3pm" becomes "15:00")
- priority: low, medium, or high (infer from context, default to medium)
- description: Any additional details mentioned (optional)
- invitees: Names of people mentioned to invite (optional, as an array)

Be smart about parsing casual language. For example:
- "coffee with John" → title: "Coffee with John"
- "next Tuesday at 3pm" → calculate the actual date from today
- "urgent meeting" → priority: high
- "casual hangout" → priority: low`,
            },
            { role: "user", content: message }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "create_event",
                description: "Create an event with the extracted details",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string", description: "Event title" },
                    date: { type: "string", description: "Date in YYYY-MM-DD format" },
                    time: { type: "string", description: "Time in HH:MM format" },
                    priority: { type: "string", enum: ["low", "medium", "high"] },
                    description: { type: "string", description: "Optional description" },
                    invitees: { type: "array", items: { type: "string" }, description: "Names of people to invite" }
                  },
                  required: ["title", "date", "time", "priority"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "create_event" } }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
            { status: 402, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("Failed to parse event");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall?.function?.arguments) {
        throw new Error("Failed to parse event details");
      }

      const parsedEvent: ParseEventResult = JSON.parse(toolCall.function.arguments);
      
      return new Response(
        JSON.stringify({ success: true, event: parsedEvent }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "search") {
      // Smart search through events
      if (!events || events.length === 0) {
        return new Response(
          JSON.stringify({ success: true, results: [] }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const eventsSummary = events.map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.event_date,
        time: e.event_time,
        description: e.description,
        priority: e.priority
      }));

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are an AI assistant that helps find relevant events based on semantic search.
Given a user's search query and a list of events, identify which events are most relevant.
Consider:
- Semantic meaning (e.g., "hangout with friends" matches "coffee catch-up")
- Time-based queries (e.g., "what's happening this week")
- Priority or urgency-based queries
- People mentioned

Available events:
${JSON.stringify(eventsSummary, null, 2)}

Return the IDs of relevant events with a brief explanation of why each is relevant.`,
            },
            { role: "user", content: message }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_search_results",
                description: "Return the search results",
                parameters: {
                  type: "object",
                  properties: {
                    results: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          relevanceReason: { type: "string" }
                        },
                        required: ["id", "relevanceReason"]
                      }
                    }
                  },
                  required: ["results"],
                  additionalProperties: false
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "return_search_results" } }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
            { status: 402, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        throw new Error("Failed to search events");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      
      if (!toolCall?.function?.arguments) {
        return new Response(
          JSON.stringify({ success: true, results: [] }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const searchResults = JSON.parse(toolCall.function.arguments);
      
      // Enrich results with full event data
      const enrichedResults = searchResults.results.map((result: any) => {
        const event = events.find((e: any) => e.id === result.id);
        return event ? { ...event, relevanceReason: result.relevanceReason } : null;
      }).filter(Boolean);

      return new Response(
        JSON.stringify({ success: true, results: enrichedResults }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else if (action === "chat") {
      // General chat about events
      const eventsSummary = events?.map((e: any) => ({
        title: e.title,
        date: e.event_date,
        time: e.event_time,
        description: e.description,
        priority: e.priority,
        isCompleted: e.is_completed
      })) || [];

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "system",
              content: `You are a friendly AI event assistant. Help users manage their events and schedule.
You can help with:
- Answering questions about their events
- Suggesting optimal times for new events
- Providing event summaries

Current events:
${JSON.stringify(eventsSummary, null, 2)}

Today's date: ${new Date().toISOString().split("T")[0]}

Be concise and helpful. If users want to create an event, tell them to type something like "Schedule a meeting with John next Tuesday at 3pm" and you'll help parse it.`,
            },
            { role: "user", content: message }
          ],
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
            { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add more credits." }),
            { status: 402, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        throw new Error("Failed to get response");
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "I couldn't process that. Please try again.";

      return new Response(
        JSON.stringify({ success: true, reply }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("Error in ai-event-assistant:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
