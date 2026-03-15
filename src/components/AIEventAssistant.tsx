import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, Sparkles, X, Calendar, Check, Mic, MicOff, Volume2, VolumeX, Clock, Plus, Trash2, Radio, LogOut } from "lucide-react";
import { useAIEventAssistant } from "@/hooks/useAIEventAssistant";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";

const ALL_SUGGESTIONS = [
  { text: "Schedule a coffee with Sarah next Friday at 10am", category: "create" },
  { text: "Book a team meeting for Monday at 2pm", category: "create" },
  { text: "Plan a lunch with John tomorrow at noon", category: "create" },
  { text: "Set up a workout session for Saturday morning", category: "create" },
  { text: "Create a dentist appointment for next week", category: "create" },
  { text: "Find events with friends this week", category: "search" },
  { text: "What's my schedule looking like?", category: "view" },
  { text: "Show me my events for tomorrow", category: "view" },
  { text: "Do I have anything planned this weekend?", category: "view" },
  { text: "What meetings do I have today?", category: "view" },
  { text: "Suggest a good time for a meeting this week", category: "suggest" },
  { text: "When am I free for a 1-hour call?", category: "suggest" },
  { text: "Find the best time for a team sync", category: "suggest" },
  { text: "What's a good slot for lunch with the team?", category: "suggest" },
];

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
  const [handsFreeMode, setHandsFreeMode] = useState(false);
  const recognitionRef = useRef<typeof window.SpeechRecognition.prototype | null>(null);
  const { speak, stop, isSpeaking, isSupported: ttsSupported } = useTextToSpeech();
  const [suggestionSeed, setSuggestionSeed] = useState(0);
  const pendingSubmitRef = useRef<string | null>(null);
  const handsFreeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh suggestions every time the assistant opens
  useEffect(() => {
    if (open) {
      setSuggestionSeed(prev => prev + 1);
    }
  }, [open]);

  const randomSuggestions = useMemo(() => {
    const shuffled = [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5);
    const selected: typeof ALL_SUGGESTIONS = [];
    const usedCategories = new Set<string>();
    for (const item of shuffled) {
      if (!usedCategories.has(item.category) && selected.length < 4) {
        selected.push(item);
        usedCategories.add(item.category);
      }
    }
    for (const item of shuffled) {
      if (selected.length >= 4) break;
      if (!selected.includes(item)) selected.push(item);
    }
    return selected.slice(0, 4);
  }, [suggestionSeed]);

  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {}
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || isLoading || isSpeaking) return;
    try {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Failed to start listening:', error);
    }
  }, [isLoading, isSpeaking]);

  // Initialize speech recognition
  useEffect(() => {
    if (!speechSupported) return;

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let finalTranscript = '';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      setInput(finalTranscript || interimTranscript);
      if (finalTranscript) {
        pendingSubmitRef.current = finalTranscript;
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please enable it in your browser settings.');
        setHandsFreeMode(false);
      } else if (event.error === 'no-speech' && handsFreeMode) {
        setTimeout(() => {
          if (handsFreeMode && !isLoading && !isSpeaking) {
            startListening();
          }
        }, 500);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (pendingSubmitRef.current && handsFreeMode) {
        const transcript = pendingSubmitRef.current;
        pendingSubmitRef.current = null;
        if (transcript.trim()) {
          setInput('');
          sendMessage(transcript.trim());
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [speechSupported, handsFreeMode, isLoading, isSpeaking, sendMessage, startListening]);

  // Restart listening after TTS finishes (hands-free mode)
  useEffect(() => {
    if (handsFreeMode && !isSpeaking && !isLoading && !isListening && messages.length > 0) {
      handsFreeTimeoutRef.current = setTimeout(() => {
        if (handsFreeMode && !isSpeaking && !isLoading) {
          startListening();
        }
      }, 1000);
    }
    return () => {
      if (handsFreeTimeoutRef.current) {
        clearTimeout(handsFreeTimeoutRef.current);
      }
    };
  }, [handsFreeMode, isSpeaking, isLoading, isListening, messages.length, startListening]);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-speak new assistant messages — ONLY when dialog is open
  useEffect(() => {
    // FIX: added `open` check — previously TTS would fire even after the dialog
    // was closed because the effect only depended on messages/voiceEnabled.
    if (!open) return;
    if (messages.length > 0 && voiceEnabled && ttsSupported) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && !isLoading) {
        speak(lastMessage.content);
      }
    }
  }, [messages, voiceEnabled, ttsSupported, speak, isLoading, open]);

  useEffect(() => {
    if (open && inputRef.current && !handsFreeMode) {
      inputRef.current.focus();
    }
  }, [open, handsFreeMode]);

  // FIX: Stop ALL audio and recognition when dialog closes.
  // Also stop when the browser tab loses focus (visibilitychange) so it doesn't
  // keep listening/speaking when you switch tabs.
  useEffect(() => {
    if (!open) {
      // Stop speech recognition
      stopListening();
      // Stop text-to-speech
      stop();
      // Cancel any pending hands-free restart timer
      if (handsFreeTimeoutRef.current) {
        clearTimeout(handsFreeTimeoutRef.current);
      }
      // Turn off hands-free mode
      setHandsFreeMode(false);
      // Clear any pending voice submission
      pendingSubmitRef.current = null;
    }
  }, [open, stopListening, stop]);

  // FIX: Stop voice when user switches to another browser tab.
  // Previously the mic kept listening and TTS kept playing even in background tabs,
  // which caused the "noise when typing in other tabs" bug.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden — stop everything
        stopListening();
        stop();
        if (handsFreeTimeoutRef.current) {
          clearTimeout(handsFreeTimeoutRef.current);
        }
        pendingSubmitRef.current = null;
        // Don't turn off handsFreeMode — just pause it so it can resume when tab is visible again
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [stopListening, stop]);

  const toggleHandsFreeMode = useCallback(() => {
    if (handsFreeMode) {
      setHandsFreeMode(false);
      stopListening();
      stop();
      toast.info("Hands-free mode disabled");
    } else {
      if (!speechSupported) {
        toast.error("Speech recognition not supported in your browser");
        return;
      }
      setHandsFreeMode(true);
      setVoiceEnabled(true);
      toast.success("Hands-free mode enabled! Start speaking...");
      startListening();
    }
  }, [handsFreeMode, speechSupported, stopListening, stop, startListening]);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

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
      toast.success(`Event "${parsedEvent.title}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleCreateFromTimeSuggestion = async (suggestion: { time: string; date: string }) => {
    if (!user) return;
    const timeMatch = suggestion.time.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM|am|pm)?/i);
    let eventTime = "09:00";
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const period = timeMatch[3]?.toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      eventTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    const eventDate = suggestion.date || new Date().toISOString().split('T')[0];
    try {
      const { error } = await supabase.from("events").insert({
        creator_id: user.id,
        title: "New Event",
        event_date: eventDate,
        event_time: eventTime,
        priority: "medium",
      });
      if (error) throw error;
      toast.success(`Event scheduled for ${suggestion.time}!`);
      queryClient.invalidateQueries({ queryKey: ["events"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    }
  };

  return (
    <Card
      className={cn(
        "fixed bottom-20 right-4 w-[400px] max-w-[calc(100vw-2rem)] shadow-2xl z-50 flex flex-col transition-all duration-300",
        open
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      )}
      style={{ maxHeight: "calc(100vh - 120px)" }}
    >
      <CardHeader className="flex flex-row items-center justify-between p-4 pb-2 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          AI Assistant
          {handsFreeMode && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 animate-pulse">
              Hands-free
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-1">
          {ttsSupported && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                setVoiceEnabled(!voiceEnabled);
                if (voiceEnabled) stop();
              }}
              title={voiceEnabled ? "Mute voice responses" : "Enable voice responses"}
            >
              {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={clearMessages}
            title="Clear conversation"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 px-4 min-h-0" ref={scrollRef as any}>
        <div className="space-y-3 pb-2">
          {messages.length === 0 && (
            <div className="space-y-2 py-4">
              <p className="text-xs text-muted-foreground text-center mb-3">Try asking:</p>
              {randomSuggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => setInput(suggestion.text)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-xs transition-colors"
                >
                  {suggestion.text}
                </button>
              ))}

              {handsFreeMode && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full gap-2"
                    onClick={() => onOpenChange(false)}
                  >
                    <LogOut className="h-3 w-3" />
                    Exit Assistant
                  </Button>
                </div>
              )}
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

                {message.parsedEvent && (
                  <Button
                    size="sm"
                    className="mt-3 w-full gap-2"
                    onClick={() => handleCreateEvent(message.parsedEvent!)}
                    disabled={creatingEvent}
                  >
                    {creatingEvent
                      ? <><Loader2 className="h-3 w-3 animate-spin" />Creating...</>
                      : <><Check className="h-3 w-3" />Create Event</>
                    }
                  </Button>
                )}

                {message.searchResults && message.searchResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.searchResults.slice(0, 3).map((result) => (
                      <div key={result.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/50 text-xs">
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
        {handsFreeMode && (
          <div className="flex items-center justify-center gap-2 mb-2 py-2 px-3 rounded-lg bg-success/10 border border-success/20">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isListening ? "bg-success animate-pulse" : isSpeaking ? "bg-primary animate-pulse" : "bg-muted-foreground"
            )} />
            <span className="text-xs font-medium">
              {isListening ? "Listening..." : isSpeaking ? "Speaking..." : isLoading ? "Processing..." : "Waiting..."}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening..." : handsFreeMode ? "Hands-free active" : "Schedule a meeting, search events..."}
            className="flex-1"
            disabled={isLoading || handsFreeMode}
          />

          {speechSupported && (
            <Button
              type="button"
              size="icon"
              variant={handsFreeMode ? "default" : "outline"}
              onClick={toggleHandsFreeMode}
              disabled={isLoading}
              className={cn(handsFreeMode && "bg-success hover:bg-success/90")}
              title={handsFreeMode ? "Disable hands-free mode" : "Enable hands-free mode"}
            >
              <Radio className={cn("h-4 w-4", handsFreeMode && "animate-pulse")} />
            </Button>
          )}

          {speechSupported && !handsFreeMode && (
            <Button
              type="button"
              size="icon"
              variant={isListening ? "destructive" : "outline"}
              onClick={toggleListening}
              disabled={isLoading}
              className={isListening ? "animate-pulse" : ""}
              title={isListening ? "Stop listening" : "Start voice input"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
          )}

          <Button type="submit" size="icon" disabled={isLoading || !input.trim() || handsFreeMode}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}