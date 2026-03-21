import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

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

export interface AIMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  parsedEvent?: ParsedEvent;
  searchResults?: SearchResult[];
  timeSuggestions?: TimeSuggestion[];
  created_at?: string;
}

export function useAIConversation() {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load or create conversation on mount
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const loadConversation = async () => {
      try {
        // Try to get existing conversation
        const { data: conversations, error: fetchError } = await supabase
          .from("ai_conversations")
          .select("id")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1);

        if (fetchError) throw fetchError;

        let convId: string;

        if (conversations && conversations.length > 0) {
          convId = conversations[0].id;
        } else {
          // Create new conversation
          const { data: newConv, error: createError } = await supabase
            .from("ai_conversations")
            .insert({ user_id: user.id })
            .select("id")
            .single();

          if (createError) throw createError;
          convId = newConv.id;
        }

        setConversationId(convId);

        // Load messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("ai_messages")
          .select("*")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });

        if (messagesError) throw messagesError;

        const loadedMessages: AIMessage[] = (messagesData || []).map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          parsedEvent: m.parsed_event,
          searchResults: m.search_results,
          timeSuggestions: m.time_suggestions,
          created_at: m.created_at,
        }));

        setMessages(loadedMessages);
      } catch (error) {
        console.error("Error loading AI conversation:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConversation();
  }, [user]);

  const addMessage = useCallback(async (message: AIMessage) => {
    if (!conversationId) return;

    // Optimistically add to local state
    setMessages(prev => [...prev, message]);

    try {
      const insertData = {
        conversation_id: conversationId,
        role: message.role,
        content: message.content,
        parsed_event: message.parsedEvent || null,
        search_results: message.searchResults || null,
        time_suggestions: message.timeSuggestions || null,
      };
      
      const { data, error } = await supabase
        .from("ai_messages")
        .insert(insertData as any)
        .select("id")
        .single();

      if (error) throw error;

      // Update message with ID
      setMessages(prev => 
        prev.map((m, i) => 
          i === prev.length - 1 ? { ...m, id: data.id } : m
        )
      );

      // Update conversation timestamp
      await supabase
        .from("ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

    } catch (error) {
      console.error("Error saving message:", error);
    }
  }, [conversationId]);

  const clearConversation = useCallback(async () => {
    if (!conversationId || !user) return;

    try {
      // Delete current conversation
      await supabase
        .from("ai_conversations")
        .delete()
        .eq("id", conversationId);

      // Create new conversation
      const { data: newConv, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: user.id })
        .select("id")
        .single();

      if (error) throw error;

      setConversationId(newConv.id);
      setMessages([]);
    } catch (error) {
      console.error("Error clearing conversation:", error);
    }
  }, [conversationId, user]);

  return {
    conversationId,
    messages,
    setMessages,
    addMessage,
    clearConversation,
    isLoading,
  };
}
