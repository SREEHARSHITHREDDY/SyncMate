import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEvents } from "@/hooks/useEvents";
import { toast } from "sonner";

interface ParsedEvent {
  title: string;
  date: string;
  time: string;
  priority: "low" | "medium" | "high";
  description?: string;
  invitees?: string[];
}

interface SearchResult {
  id: string;
  title: string;
  event_date: string;
  event_time: string;
  description: string | null;
  priority: string;
  relevanceReason: string;
}

interface TimeSuggestion {
  time: string;
  date: string;
  dateFormatted: string;
  reason: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  parsedEvent?: ParsedEvent;
  searchResults?: SearchResult[];
  timeSuggestions?: TimeSuggestion[];
}

export function useAIEventAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { events } = useEvents();

  const sendMessage = useCallback(async (message: string): Promise<void> => {
    if (!message.trim()) return;

    // Add user message to chat
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      // Detect intent from message
      const lowerMessage = message.toLowerCase();
      
      // Check for schedule/view intent FIRST (questions about existing schedule)
      const isScheduleViewIntent =
        lowerMessage.includes("what's my schedule") ||
        lowerMessage.includes("whats my schedule") ||
        lowerMessage.includes("my schedule") ||
        lowerMessage.includes("show my schedule") ||
        lowerMessage.includes("schedule looking like") ||
        lowerMessage.includes("what do i have") ||
        lowerMessage.includes("what events") ||
        lowerMessage.includes("show me my events") ||
        lowerMessage.includes("upcoming events") ||
        lowerMessage.includes("today's events") ||
        lowerMessage.includes("this week");

      const isSearchIntent =
        lowerMessage.includes("find") ||
        lowerMessage.includes("search") ||
        lowerMessage.includes("show me") ||
        lowerMessage.includes("when is") ||
        lowerMessage.includes("do i have");

      const isSuggestTimeIntent =
        lowerMessage.includes("suggest") ||
        lowerMessage.includes("best time") ||
        lowerMessage.includes("good time") ||
        lowerMessage.includes("optimal time") ||
        lowerMessage.includes("when should") ||
        lowerMessage.includes("free slot") ||
        lowerMessage.includes("available time");

      const isScheduleIntent = 
        !isScheduleViewIntent && // Don't treat view intent as create intent
        !isSuggestTimeIntent && // Don't treat suggestion requests as create
        (
          lowerMessage.includes("schedule") ||
          lowerMessage.includes("create") ||
          lowerMessage.includes("plan") ||
          lowerMessage.includes("set up") ||
          lowerMessage.includes("book") ||
          lowerMessage.includes("add event") ||
          lowerMessage.includes("meeting at") ||
          (lowerMessage.includes("at ") && (
            lowerMessage.includes("am") || 
            lowerMessage.includes("pm") ||
            /\d{1,2}:\d{2}/.test(lowerMessage)
          ))
        );

      let action = "chat";
      if (isScheduleViewIntent) action = "chat"; // Always use chat for viewing schedule
      else if (isSuggestTimeIntent) action = "suggest_time";
      else if (isSearchIntent) action = "search";
      else if (isScheduleIntent) action = "parse";

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-event-assistant`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action,
            message,
            events: events.map((e) => ({
              id: e.id,
              title: e.title,
              event_date: e.event_date,
              event_time: e.event_time,
              description: e.description,
              priority: e.priority,
              is_completed: (e as any).is_completed,
            })),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response");
      }

      const data = await response.json();

      if (action === "parse" && data.event) {
        // Event was parsed
        const { event } = data;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I understood that! Here's what I parsed:\n\n📅 **${event.title}**\n📆 ${event.date} at ${event.time}\n🎯 Priority: ${event.priority}${event.description ? `\n📝 ${event.description}` : ""}${event.invitees?.length ? `\n👥 Invite: ${event.invitees.join(", ")}` : ""}\n\nWould you like me to create this event?`,
            parsedEvent: event,
          },
        ]);
      } else if (action === "suggest_time" && data.suggestions) {
        // Time suggestions with clickable slots
        const suggestions: TimeSuggestion[] = data.suggestions.map((s: any) => ({
          time: s.time,
          date: s.date || new Date().toISOString().split('T')[0],
          dateFormatted: s.dateFormatted || s.time.split(' ')[0] || 'Today',
          reason: s.reason,
        }));
        
        const suggestionsText = suggestions
          .map((s, i) => `${i + 1}. **${s.time}**\n   _${s.reason}_`)
          .join("\n\n");
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Based on your schedule, here are the best times:\n\n${suggestionsText}\n\nClick any slot below to create an event:`,
            timeSuggestions: suggestions,
          },
        ]);
      } else if (action === "search" && data.results) {
        // Search results
        if (data.results.length === 0) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "I couldn't find any events matching your search. Try a different query or check your upcoming events." },
          ]);
        } else {
          const resultsSummary = data.results
            .map((r: SearchResult) => `• **${r.title}** (${r.event_date})\n  _${r.relevanceReason}_`)
            .join("\n\n");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Found ${data.results.length} relevant event${data.results.length > 1 ? "s" : ""}:\n\n${resultsSummary}`,
              searchResults: data.results,
            },
          ]);
        }
      } else {
        // General chat
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply || "I couldn't process that. Please try again." },
        ]);
      }
    } catch (error: any) {
      console.error("AI Assistant error:", error);
      toast.error(error.message || "Failed to process your request");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [events]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
  };
}
