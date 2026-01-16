import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, ChevronRight, ChevronLeft, Calendar, Users, Bell, Sparkles, Mic, Search, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  highlight?: string;
  features: string[];
}

const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to SyncMates! 🎉",
    description: "Your smart social scheduling companion. Let me show you how SyncMates makes planning with friends effortless.",
    icon: Calendar,
    features: [
      "Easy event creation",
      "Friend invitations",
      "Smart notifications",
      "AI-powered scheduling",
    ],
  },
  {
    id: "dashboard",
    title: "Your Personal Dashboard",
    description: "See all your upcoming events at a glance. Filter by priority, view responses from friends, and never miss an important gathering.",
    icon: Calendar,
    highlight: "dashboard",
    features: [
      "View all events in one place",
      "Filter by priority (High, Medium, Low)",
      "See friend responses instantly",
      "Mark events as complete",
    ],
  },
  {
    id: "friends",
    title: "Connect with Friends",
    description: "Build your network by adding friends. Search by email, send invites, and start planning together seamlessly.",
    icon: Users,
    highlight: "friends",
    features: [
      "Search friends by email",
      "Send & receive friend requests",
      "See your connections",
      "Invite friends to events",
    ],
  },
  {
    id: "calendar",
    title: "Calendar View",
    description: "Visualize your schedule on a beautiful calendar. See which days are busy, plan ahead, and stay organized.",
    icon: Calendar,
    highlight: "calendar",
    features: [
      "Monthly calendar overview",
      "Click any date to create events",
      "See event density per day",
      "Easy navigation between months",
    ],
  },
  {
    id: "notifications",
    title: "Stay Notified",
    description: "Never miss an update! Get real-time notifications when friends respond to your invites or when events are approaching.",
    icon: Bell,
    highlight: "notifications",
    features: [
      "Real-time push notifications",
      "Email reminders",
      "1-hour and 1-day alerts",
      "Customizable preferences",
    ],
  },
  {
    id: "ai-assistant",
    title: "AI Event Assistant ✨",
    description: "Our star feature! Use natural language to schedule events. Just say 'Schedule a coffee with Sarah next Friday at 10am' and we'll do the rest.",
    icon: Sparkles,
    highlight: "ai",
    features: [
      "Natural language scheduling",
      "Voice input support",
      "Smart event search",
      "Optimal time suggestions",
    ],
  },
  {
    id: "voice",
    title: "Voice Commands",
    description: "Hands too busy? Use your voice! Click the microphone and speak your event request. The AI understands you perfectly.",
    icon: Mic,
    highlight: "voice",
    features: [
      "Speech-to-text input",
      "Works on all modern browsers",
      "Accurate transcription",
      "Hands-free scheduling",
    ],
  },
  {
    id: "smart-search",
    title: "Smart Search",
    description: "Find events by description, not just keywords. Ask 'Show me events with friends' or 'Find my weekend plans' and get intelligent results.",
    icon: Search,
    highlight: "search",
    features: [
      "Semantic search capability",
      "Natural language queries",
      "Relevance-based results",
      "Quick event discovery",
    ],
  },
  {
    id: "time-suggestions",
    title: "Optimal Time Suggestions",
    description: "Not sure when to schedule? Ask the AI to suggest the best times based on your existing schedule. Smart scheduling made easy!",
    icon: Clock,
    highlight: "time",
    features: [
      "Analyzes your schedule",
      "Suggests free slots",
      "Considers preferences",
      "Avoids conflicts",
    ],
  },
];

interface GuidedDemoTourProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function GuidedDemoTour({ open, onClose, onComplete }: GuidedDemoTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const step = tourSteps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === tourSteps.length - 1;

  const goToNext = useCallback(() => {
    if (isLastStep) {
      onComplete();
      return;
    }
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
      setIsAnimating(false);
    }, 150);
  }, [isLastStep, onComplete]);

  const goToPrev = useCallback(() => {
    if (isFirstStep) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep((prev) => prev - 1);
      setIsAnimating(false);
    }, 150);
  }, [isFirstStep]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowRight" || e.key === "Enter") goToNext();
      if (e.key === "ArrowLeft") goToPrev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, goToNext, goToPrev, onClose]);

  // Don't render anything when closed, but all hooks are still called above
  if (!open) return null;

  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Tour Card */}
      <Card className={cn(
        "relative w-[480px] max-w-[calc(100vw-2rem)] shadow-2xl z-10",
        "animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
      )}>
        {/* Close button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 h-8 w-8 z-10"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-secondary rounded-t-lg overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300"
            style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
          />
        </div>

        <CardContent className="pt-10 pb-6 px-6">
          {/* Icon */}
          <div className={cn(
            "mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mb-6 transition-all duration-300",
            isAnimating && "scale-90 opacity-50"
          )}>
            <Icon className="h-8 w-8 text-white" />
          </div>

          {/* Content */}
          <div className={cn(
            "text-center transition-all duration-300",
            isAnimating && "opacity-0 translate-y-2"
          )}>
            <h2 className="text-xl font-bold mb-3">{step.title}</h2>
            <p className="text-muted-foreground mb-6">{step.description}</p>

            {/* Features list */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              {step.features.map((feature, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-2 text-sm text-left bg-secondary/50 rounded-lg px-3 py-2"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={goToPrev}
              disabled={isFirstStep}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {/* Step indicators */}
            <div className="flex gap-1.5">
              {tourSteps.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setIsAnimating(true);
                    setTimeout(() => {
                      setCurrentStep(i);
                      setIsAnimating(false);
                    }, 150);
                  }}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    i === currentStep 
                      ? "w-6 bg-primary" 
                      : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                  )}
                />
              ))}
            </div>

            <Button onClick={goToNext} className="gap-1">
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          {/* Skip hint */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">→</kbd> to continue or{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs">Esc</kbd> to skip
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
