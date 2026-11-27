import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  Clock,
  ArrowRight,
  Check,
  Sparkles,
  Play,
  Moon,
  Sun,
  Zap,
  Bell,
  ListTodo,
  FileText,
  Star,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { GuidedDemoTour } from "@/components/GuidedDemoTour";
import heroIllustration from "@/assets/hero-illustration.png";

const features = [
  {
    icon: Zap,
    title: "Find the Best Time — Instantly",
    description:
      "SyncMates overlays everyone's schedules in a 7-day grid. Green means free, red means busy. One click and your event is set.",
    highlight: true,
  },
  {
    icon: Users,
    title: "Connect with Friends",
    description:
      "Add your circle, get friend requests by email, and start planning together — no shared account needed.",
    highlight: false,
  },
  {
    icon: Calendar,
    title: "Smart Event Calendar",
    description:
      "Day, Week, Month, and Year views. Create recurring events, set priorities, categorize by type, and track RSVPs.",
    highlight: false,
  },
  {
    icon: Bell,
    title: "Real-Time Notifications",
    description:
      "Email and in-app alerts the moment someone accepts, declines, or sends a friend request. Never miss a response.",
    highlight: false,
  },
  {
    icon: ListTodo,
    title: "Shared Task Lists",
    description:
      "Assign action items to attendees directly from an event. Track completion — perfect for group trips and projects.",
    highlight: false,
  },
  {
    icon: FileText,
    title: "Event Templates",
    description:
      "Save your go-to event formats — weekly standup, movie night, study session — and create them in seconds next time.",
    highlight: false,
  },
];

const steps = [
  { step: "1", title: "Sign up free", desc: "Create your account in seconds — no credit card required." },
  { step: "2", title: "Add your friends", desc: "Send friend requests by name. They get a notification instantly." },
  { step: "3", title: "Find a free slot", desc: "Open Find Time, pick friends, and see everyone's availability overlaid." },
  { step: "4", title: "Create the event", desc: "Click any free slot to create the event with one tap. Done." },
];

const testimonials = [
  {
    text: "We used to spend 20 minutes in a WhatsApp group deciding when to meet. SyncMates solved that in 10 seconds.",
    name: "Priya S.",
    role: "College student",
  },
  {
    text: "The availability finder is genuinely magical. Everyone's schedule overlaid on one grid — why didn't this exist before?",
    name: "Rahul M.",
    role: "Software engineer",
  },
  {
    text: "I use it every week to coordinate our friend group. The reminder emails mean nobody forgets anymore.",
    name: "Ananya K.",
    role: "Working professional",
  },
];

export default function Index() {
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showDemo, setShowDemo] = useState(false);

  const handleDemoComplete = () => {
    setShowDemo(false);
    navigate("/auth");
  };

  return (
    <>
      <GuidedDemoTour
        open={showDemo}
        onClose={() => setShowDemo(false)}
        onComplete={handleDemoComplete}
      />
      <AppLayout>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Background blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl float" />
            <div className="absolute top-40 right-20 w-48 h-48 rounded-full bg-accent/10 blur-3xl float-delayed" />
            <div className="absolute bottom-20 left-1/4 w-32 h-32 rounded-full bg-primary/10 blur-2xl float-slow" />
          </div>

          {/* Floating icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-32 left-[15%] float">
              <div className="w-12 h-12 rounded-xl bg-primary/10 rotate-12 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary/60" />
              </div>
            </div>
            <div className="absolute top-48 right-[12%] float-delayed">
              <div className="w-10 h-10 rounded-lg bg-accent/15 -rotate-12 flex items-center justify-center">
                <Users className="w-5 h-5 text-accent/70" />
              </div>
            </div>
            <div className="absolute bottom-32 left-[8%] float-slow">
              <div className="w-8 h-8 rounded-lg bg-success/15 rotate-6 flex items-center justify-center">
                <Check className="w-4 h-4 text-success/70" />
              </div>
            </div>
            <div className="absolute bottom-40 right-[18%] float">
              <div className="w-14 h-14 rounded-2xl bg-warning/10 -rotate-6 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-warning/60" />
              </div>
            </div>
          </div>

          <div className="container relative py-16 md:py-24">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text */}
              <div className="text-center lg:text-left animate-fade-in-up">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                  <Zap className="h-4 w-4" />
                  Social scheduling, simplified
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                  Stop asking
                  <br />
                  <span className="text-primary">"when are you free?"</span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                  SyncMates shows everyone's availability in one grid. Find the perfect time,
                  create the event, and get people there — no group chat chaos.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                  {user ? (
                    <Link to="/dashboard">
                      <Button size="lg" className="gap-2 w-full sm:w-auto shadow-soft">
                        Go to Dashboard
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  ) : (
                    <>
                      <Link to="/auth">
                        <Button size="lg" className="gap-2 w-full sm:w-auto shadow-soft">
                          Get Started Free
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full sm:w-auto gap-2"
                        onClick={() => setShowDemo(true)}
                      >
                        <Play className="h-4 w-4" />
                        View Demo
                      </Button>
                    </>
                  )}
                </div>

                {/* Trust badges */}
                <div className="flex flex-wrap gap-4 mt-8 justify-center lg:justify-start">
                  {["Free forever", "No credit card", "2-min setup"].map((item) => (
                    <div key={item} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hero image */}
              <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl scale-90 opacity-60" />
                  <div className="relative rounded-2xl overflow-hidden shadow-soft-lg border border-border/50 bg-card">
                    <img
                      src={heroIllustration}
                      alt="SyncMates app — group availability finder"
                      className="w-full h-auto"
                    />
                  </div>

                  {/* Floating notification cards */}
                  <div className="absolute -left-4 top-1/4 animate-fade-in float-delayed" style={{ animationDelay: "0.4s" }}>
                    <div className="bg-card rounded-xl shadow-soft p-3 border border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">Alex accepted!</p>
                          <p className="text-[10px] text-muted-foreground">Movie Night · Sat 8 PM</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute -right-4 bottom-1/4 animate-fade-in float" style={{ animationDelay: "0.6s" }}>
                    <div className="bg-card rounded-xl shadow-soft p-3 border border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="text-xs font-medium">3 free slots found</p>
                          <p className="text-[10px] text-muted-foreground">This weekend</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────────────────────────── */}
        <section className="py-20 bg-secondary/30">
          <div className="container">
            <div className="text-center mb-14 animate-fade-in">
              <h2 className="text-3xl font-bold mb-4">How it works</h2>
              <p className="text-muted-foreground max-w-lg mx-auto">
                From sign-up to your first group event in under 2 minutes.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((s, i) => (
                <div
                  key={i}
                  className="relative p-6 rounded-2xl bg-card border border-border/50 animate-fade-in"
                  style={{ animationDelay: `${0.1 + i * 0.1}s` }}
                >
                  {/* connector line */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-px bg-border/60 z-10" />
                  )}
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm mb-4">
                    {s.step}
                  </div>
                  <h3 className="text-base font-semibold mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────────── */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-14 animate-fade-in">
              <h2 className="text-3xl font-bold mb-4">Everything your group needs</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Built specifically for friend groups and small teams who want to spend less time
                coordinating and more time actually doing things together.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className={`group p-6 rounded-2xl border card-hover animate-fade-in ${
                    feature.highlight
                      ? "bg-primary/5 border-primary/30"
                      : "bg-card border-border/50"
                  }`}
                  style={{ animationDelay: `${0.1 + i * 0.08}s` }}
                >
                  <div
                    className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${
                      feature.highlight ? "bg-primary/15" : "bg-primary/10"
                    }`}
                  >
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  {feature.highlight && (
                    <div className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-medium">
                      <Star className="h-3 w-3 fill-primary" />
                      Core feature
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials ───────────────────────────────────────────────── */}
        <section className="py-20 bg-secondary/30">
          <div className="container">
            <div className="text-center mb-14 animate-fade-in">
              <h2 className="text-3xl font-bold mb-4">People love SyncMates</h2>
              <p className="text-muted-foreground">Real feedback from early users.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map((t, i) => (
                <div
                  key={i}
                  className="p-6 rounded-2xl bg-card border border-border/50 animate-fade-in"
                  style={{ animationDelay: `${0.1 + i * 0.1}s` }}
                >
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ────────────────────────────────────────────────────────── */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl" />
          </div>
          <div className="container relative">
            <div className="max-w-2xl mx-auto text-center animate-fade-in">
              <h2 className="text-3xl font-bold mb-4">Stop scheduling. Start meeting.</h2>
              <p className="text-muted-foreground mb-8">
                Join SyncMates — it's free, it's fast, and your friends will thank you.
              </p>
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                {["Free forever", "No credit card", "Setup in 2 minutes", "Works on mobile"].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              {user ? (
                <Link to="/dashboard">
                  <Button size="lg" className="gap-2 shadow-soft">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link to="/auth">
                  <Button size="lg" className="gap-2 shadow-soft">
                    Create Your Free Account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="border-t border-border/50 py-8 mt-auto">
          <div className="container flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                  <Calendar className="h-4 w-4" />
                </div>
                <span className="font-semibold">SyncMates</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                      className="h-8 w-8"
                    >
                      {resolvedTheme === "dark" ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2026 SyncMates. Made with ♥ for better planning.
            </p>
          </div>
        </footer>

      </AppLayout>
    </>
  );
}
