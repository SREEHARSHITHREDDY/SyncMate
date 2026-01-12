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

// All possible suggestions - will be randomly selected
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
  
  // Voice confirmation states
  const [pendingEventConfirmation, setPendingEventConfirmation] = useState<{
    title: string;
    date: string;
    time: string;
    priority: "low" | "medium" | "high";
    description?: string;
  } | null>(null);
  const [confirmationMode, setConfirmationMode] = useState(false);

  // Refresh suggestions every time the assistant opens
  useEffect(() => {
    if (open) {
      setSuggestionSeed(prev => prev + 1);
    }
  }, [open]);

  // Get random suggestions - changes each time suggestionSeed changes
  const randomSuggestions = useMemo(() => {
    // Shuffle and pick 4 suggestions from different categories
    const shuffled = [...ALL_SUGGESTIONS].sort(() => Math.random() - 0.5);
    const selected: typeof ALL_SUGGESTIONS = [];
    const usedCategories = new Set<string>();
    
    // Try to get one from each category first
    for (const item of shuffled) {
      if (!usedCategories.has(item.category) && selected.length < 4) {
        selected.push(item);
        usedCategories.add(item.category);
      }
    }
    
    // Fill remaining slots if needed
    for (const item of shuffled) {
      if (selected.length >= 4) break;
      if (!selected.includes(item)) {
        selected.push(item);
      }
    }
    
    return selected.slice(0, 4);
  }, [suggestionSeed]);

  // Check for Web Speech API support
  const speechSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Start listening for hands-free mode
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

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Failed to stop listening:', error);
    }
    setIsListening(false);
  }, []);

  // Handle voice confirmation for event creation
  const handleVoiceConfirmation = useCallback(async (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    // Confirmation phrases
    const confirmPhrases = ["yes", "yeah", "yep", "confirm", "create", "create it", "do it", "go ahead", "sure", "ok", "okay"];
    // Rejection phrases
    const rejectPhrases = ["no", "nope", "cancel", "don't", "dont", "never mind", "nevermind", "skip", "stop"];
    
    const isConfirm = confirmPhrases.some(phrase => lowerTranscript.includes(phrase));
    const isReject = rejectPhrases.some(phrase => lowerTranscript.includes(phrase));
    
    if (isConfirm && pendingEventConfirmation) {
      // Create the event
      setConfirmationMode(false);
      await handleCreateEventWithVoiceFeedback(pendingEventConfirmation);
      setPendingEventConfirmation(null);
    } else if (isReject) {
      // Cancel
      setConfirmationMode(false);
      setPendingEventConfirmation(null);
      const cancelMessage = "Okay, I've cancelled that. What would you like to do next?";
      speak(cancelMessage);
    } else {
      // Unclear - ask again
      speak("I didn't catch that. Say 'yes' to create the event, or 'no' to cancel.");
    }
  }, [pendingEventConfirmation, speak]);

  // Create event with voice feedback
  const handleCreateEventWithVoiceFeedback = useCallback(async (parsedEvent: {
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
      
      // Voice feedback for hands-free mode
      if (handsFreeMode) {
        const formattedDate = format(parseISO(parsedEvent.date), "EEEE, MMMM do");
        const timeFormatted = parsedEvent.time.slice(0, 5);
        speak(`Done! I've created ${parsedEvent.title} for ${formattedDate} at ${timeFormatted}. What else would you like to do?`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
      if (handsFreeMode) {
        speak("Sorry, I couldn't create that event. Please try again.");
      }
    } finally {
      setCreatingEvent(false);
    }
  }, [user, queryClient, handsFreeMode, speak]);

  // Initialize speech recognition with enhanced handlers
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
      
      // Store final transcript for submission
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
        // In hands-free mode, restart listening if no speech detected
        setTimeout(() => {
          if (handsFreeMode && !isLoading && !isSpeaking) {
            startListening();
          }
        }, 500);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      
      // Auto-submit in hands-free mode when speech ends
      if (pendingSubmitRef.current && handsFreeMode) {
        const transcript = pendingSubmitRef.current;
        pendingSubmitRef.current = null;
        
        if (transcript.trim()) {
          setInput('');
          
          // Check if we're in confirmation mode
          if (confirmationMode) {
            handleVoiceConfirmation(transcript.trim());
          } else {
            sendMessage(transcript.trim());
          }
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [speechSupported, handsFreeMode, isLoading, isSpeaking, sendMessage, startListening, confirmationMode, handleVoiceConfirmation]);

  // Restart listening after TTS finishes speaking (hands-free mode)
  useEffect(() => {
    if (handsFreeMode && !isSpeaking && !isLoading && !isListening && messages.length > 0) {
      // Small delay before starting to listen again
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

  // Toggle hands-free mode
  const toggleHandsFreeMode = useCallback(() => {
    if (handsFreeMode) {
      // Turning off
      setHandsFreeMode(false);
      stopListening();
      stop();
      toast.info("Hands-free mode disabled");
    } else {
      // Turning on
      if (!speechSupported) {
        toast.error("Speech recognition not supported in your browser");
        return;
      }
      setHandsFreeMode(true);
      setVoiceEnabled(true); // Enable TTS when entering hands-free mode
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

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-speak new assistant messages and handle voice confirmation
  useEffect(() => {
    if (messages.length > 0 && voiceEnabled && ttsSupported) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && !isLoading) {
        // Check if this message has a parsed event and we're in hands-free mode
        if (lastMessage.parsedEvent && handsFreeMode) {
          const event = lastMessage.parsedEvent;
          const formattedDate = format(parseISO(event.date), "EEEE, MMMM do");
          const confirmationPrompt = `${lastMessage.content} Say 'yes' or 'confirm' to create this event, or 'no' to cancel.`;
          
          // Store the pending event for confirmation
          setPendingEventConfirmation(event);
          setConfirmationMode(true);
          
          speak(confirmationPrompt);
        } else {
          speak(lastMessage.content);
        }
      }
    }
  }, [messages, voiceEnabled, ttsSupported, speak, isLoading, handsFreeMode]);

  useEffect(() => {
    if (open && inputRef.current && !handsFreeMode) {
      inputRef.current.focus();
    }
  }, [open, handsFreeMode]);

  // Cleanup on unmount or close
  useEffect(() => {
    if (!open) {
      stopListening();
      stop();
      setHandsFreeMode(false);
      setPendingEventConfirmation(null);
      setConfirmationMode(false);
    }
  }, [open, stopListening, stop]);

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
      // No need to send another message - just show the toast
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
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center transition-all",
            handsFreeMode 
              ? "bg-gradient-to-br from-success to-primary animate-pulse" 
              : "bg-gradient-to-br from-primary to-accent"
          )}>
            {handsFreeMode ? (
              <Radio className="h-4 w-4 text-white" />
            ) : (
              <Sparkles className="h-4 w-4 text-white" />
            )}
          </div>
          <div className="flex flex-col">
            <span>AI Event Assistant</span>
            {handsFreeMode && (
              <span className={cn(
                "text-[10px] font-normal",
                confirmationMode ? "text-amber-500" : "text-success"
              )}>
                {confirmationMode ? "Awaiting confirmation..." : isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Ready"}
              </span>
            )}
          </div>
        </CardTitle>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={clearMessages}
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}
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
              <p className="text-xs mb-3">Try saying:</p>
              <div className="mt-3 space-y-2">
                {randomSuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.text}-${suggestionSeed}-${index}`}
                    className="block w-full text-left text-xs bg-secondary/50 hover:bg-secondary px-3 py-2 rounded-lg transition-colors"
                    onClick={() => sendMessage(suggestion.text)}
                  >
                    "{suggestion.text}"
                  </button>
                ))}
              </div>
              
              {/* Hands-free mode info */}
              {speechSupported && (
                <div className="mt-6 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-xs font-medium text-primary mb-1">🎤 Hands-Free Mode</p>
                  <p className="text-[10px] text-muted-foreground">
                    Click the radio button below to enable continuous voice conversation
                  </p>
                </div>
              )}
              
              {/* Exit button */}
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
        {/* Voice confirmation indicator */}
        {confirmationMode && pendingEventConfirmation && (
          <div className="mb-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 animate-pulse">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
              🎤 Awaiting voice confirmation...
            </p>
            <p className="text-[10px] text-muted-foreground">
              Say "yes" or "confirm" to create, or "no" to cancel
            </p>
            <div className="mt-2 p-2 rounded bg-background/50">
              <p className="text-xs font-medium">{pendingEventConfirmation.title}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(parseISO(pendingEventConfirmation.date), "MMM d")} at {pendingEventConfirmation.time.slice(0, 5)}
              </p>
            </div>
          </div>
        )}
        
        {/* Hands-free mode indicator */}
        {handsFreeMode && !confirmationMode && (
          <div className="flex items-center justify-center gap-2 mb-2 py-2 px-3 rounded-lg bg-success/10 border border-success/20">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isListening ? "bg-success animate-pulse" : isSpeaking ? "bg-primary animate-pulse" : "bg-muted-foreground"
            )} />
            <span className="text-xs font-medium">
              {isListening ? "Listening for your command..." : isSpeaking ? "Speaking response..." : isLoading ? "Processing..." : "Waiting..."}
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
          
          {/* Hands-free toggle button */}
          {speechSupported && (
            <Button
              type="button"
              size="icon"
              variant={handsFreeMode ? "default" : "outline"}
              onClick={toggleHandsFreeMode}
              disabled={isLoading}
              className={cn(
                handsFreeMode && "bg-success hover:bg-success/90"
              )}
              title={handsFreeMode ? "Disable hands-free mode" : "Enable hands-free mode"}
            >
              <Radio className={cn("h-4 w-4", handsFreeMode && "animate-pulse")} />
            </Button>
          )}
          
          {/* Manual mic button (hidden in hands-free mode) */}
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
