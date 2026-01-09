import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, Loader2, Sparkles, X, Calendar, Check, Mic, MicOff, Volume2, VolumeX, Clock, Plus } from "lucide-react";
import { useAIEventAssistant } from "@/hooks/useAIEventAssistant";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

interface AIEventAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AIEventAssistant({ open, onOpenChange }: AIEventAssistantProps) {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage, clearMessages } = useAIEventAssistant();
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const recognitionRef = useRef<typeof window.SpeechRecognition.prototype | null>(null);
  const { speak, stop, isSpeaking, isSupported: ttsSupported } = useTextToSpeech();

  // Check for Web Speech API support
  const speechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize speech recognition
  useEffect(() => {
    if (!speechSupported) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      setInput(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable it in your browser settings.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [speechSupported]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-speak new assistant messages
  useEffect(() => {
    if (messages.length > 0 && voiceEnabled && ttsSupported) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && !isLoading) {
        speak(lastMessage.content);
      }
    }
  }, [messages, voiceEnabled, ttsSupported, speak, isLoading]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput("");
    await sendMessage(message);
  };

  const handleCreateEvent = async (parsedEvent: {
    title: string;
    date: string;
    time: string;
    priority: "low" | "medium" | "high";
    description?: string;
  }) => {
    if (!user) return;
    setCreatingEvent(true);

    try {
      const { error } = await supabase.from("events").insert({
        creator_id: user.id,
        title: parsedEvent.title,
        description: parsedEvent.description || null,
        event_date: parsedEvent.date,
        event_time: parsedEvent.time,
        priority: parsedEvent.priority,
      });

      if (error) throw error;

      toast.success("Event created successfully!");
      queryClient.invalidateQueries({ queryKey: ["events"] });
      
      // Send confirmation message
      await sendMessage(`Great! I've created "${parsedEvent.title}" for you.`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleCreateFromTimeSuggestion = async (suggestion: { time: string; date: string }) => {
    if (!user) return;
    
    // Extract time from the suggestion (format: "Tuesday, Jan 14 at 2:00 PM" or similar)
    const timeMatch = suggestion.time.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?/i);
    let eventTime = "09:00";
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] || "00";
      const meridiem = timeMatch[3]?.toUpperCase();
      
      if (meridiem === "PM" && hours < 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
      
      eventTime = `${hours.toString().padStart(2, "0")}:${minutes}`;
    }

    // Use the date from suggestion or calculate from the day name
    let eventDate = suggestion.date;
    if (!eventDate || eventDate === "undefined") {
      // Try to parse from the time string (e.g., "Tuesday, Jan 14")
      const today = new Date();
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const dayMatch = suggestion.time.match(new RegExp(dayNames.join("|"), "i"));
      
      if (dayMatch) {
        const targetDay = dayNames.findIndex(d => d.toLowerCase() === dayMatch[0].toLowerCase());
        const currentDay = today.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7;
        
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysUntil);
        eventDate = targetDate.toISOString().split('T')[0];
      } else {
        eventDate = today.toISOString().split('T')[0];
      }
    }

    // Prompt user for event title
    setInput(`Schedule [event name] for ${suggestion.time}`);
    inputRef.current?.focus();
    toast.info("Enter an event name to create the event!");
  };

  if (!open) return null;

  return (
    <Card className="fixed bottom-20 right-4 w-[380px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)] shadow-2xl z-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          AI Event Assistant
        </CardTitle>
        <div className="flex items-center gap-2">
          {ttsSupported && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => {
                if (isSpeaking) stop();
                setVoiceEnabled(!voiceEnabled);
              }}
              title={voiceEnabled ? "Disable voice output" : "Enable voice output"}
            >
              {voiceEnabled ? (
                <Volume2 className={cn("h-4 w-4", isSpeaking && "text-primary animate-pulse")} />
              ) : (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm font-medium mb-2">Hi! I'm your AI Event Assistant</p>
              <p className="text-xs">Try saying:</p>
              <div className="mt-3 space-y-2">
                <button
                  className="block w-full text-left text-xs bg-secondary/50 hover:bg-secondary px-3 py-2 rounded-lg transition-colors"
                  onClick={() => sendMessage("Schedule a coffee with Sarah next Friday at 10am")}
                >
                  "Schedule a coffee with Sarah next Friday at 10am"
                </button>
                <button
                  className="block w-full text-left text-xs bg-secondary/50 hover:bg-secondary px-3 py-2 rounded-lg transition-colors"
                  onClick={() => sendMessage("Find events with friends this week")}
                >
                  "Find events with friends this week"
                </button>
                <button
                  className="block w-full text-left text-xs bg-secondary/50 hover:bg-secondary px-3 py-2 rounded-lg transition-colors"
                  onClick={() => sendMessage("What's my schedule looking like?")}
                >
                  "What's my schedule looking like?"
                </button>
                <button
                  className="block w-full text-left text-xs bg-secondary/50 hover:bg-secondary px-3 py-2 rounded-lg transition-colors"
                  onClick={() => sendMessage("Suggest a good time for a 1-hour team meeting this week")}
                >
                  "Suggest a good time for a meeting this week"
                </button>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-2",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary rounded-bl-sm"
                )}
              >
                <div className="whitespace-pre-wrap">
                  {message.content.split(/(\*\*.*?\*\*|_.*?_)/g).map((part, i) => {
                    if (part.startsWith("**") && part.endsWith("**")) {
                      return <strong key={i}>{part.slice(2, -2)}</strong>;
                    }
                    if (part.startsWith("_") && part.endsWith("_")) {
                      return <em key={i} className="text-muted-foreground">{part.slice(1, -1)}</em>;
                    }
                    return part;
                  })}
                </div>
                
                {/* Create Event Button */}
                {message.parsedEvent && (
                  <Button
                    size="sm"
                    className="mt-3 w-full gap-2"
                    onClick={() => handleCreateEvent(message.parsedEvent!)}
                    disabled={creatingEvent}
                  >
                    {creatingEvent ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" />
                        Create Event
                      </>
                    )}
                  </Button>
                )}

                {/* Search Results Quick View */}
                {message.searchResults && message.searchResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.searchResults.slice(0, 3).map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center gap-2 p-2 rounded-lg bg-background/50 text-xs"
                      >
                        <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{result.title}</p>
                          <p className="text-muted-foreground">
                            {format(parseISO(result.event_date), "MMM d")} at {result.event_time.slice(0, 5)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Time Suggestions with Quick Create */}
                {message.timeSuggestions && message.timeSuggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.timeSuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => handleCreateFromTimeSuggestion(suggestion)}
                        className="flex items-center justify-between w-full p-2 rounded-lg bg-background/50 hover:bg-primary/10 text-xs transition-colors group"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="font-medium">{suggestion.time}</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus className="h-3 w-3" />
                          <span>Create</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-2 justify-start">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-secondary rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <CardContent className="p-3 border-t shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening..." : "Schedule a meeting, search events..."}
            className="flex-1"
            disabled={isLoading}
          />
          {speechSupported && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "destructive" : "outline"}
              onClick={toggleListening}
              disabled={isLoading}
              className={isListening ? "animate-pulse" : ""}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
