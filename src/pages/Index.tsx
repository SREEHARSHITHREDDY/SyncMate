import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, ArrowRight, Check, Sparkles, Play, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { GuidedDemoTour } from "@/components/GuidedDemoTour";
import heroIllustration from "@/assets/hero-illustration.png";

const features = [
  {
    icon: Users,
    title: "Connect with Friends",
    description: "Add your friends and family to plan events together seamlessly",
  },
  {
    icon: Calendar,
    title: "Create Events",
    description: "Set up gatherings with date, time, and priority levels",
  },
  {
    icon: Clock,
    title: "Stay in Sync",
    description: "Get instant updates when friends respond to your invites",
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
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary/5 blur-3xl float" />
          <div className="absolute top-40 right-20 w-48 h-48 rounded-full bg-accent/10 blur-3xl float-delayed" />
          <div className="absolute bottom-20 left-1/4 w-32 h-32 rounded-full bg-primary/10 blur-2xl float-slow" />
        </div>

        {/* Floating decorative elements */}
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
            {/* Text Content */}
            <div className="text-center lg:text-left animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Calendar className="h-4 w-4" />
                Social scheduling, simplified
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Plan together,
                <br />
                <span className="text-primary">stay in sync</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
                SyncMates makes it easy to coordinate events with friends. 
                No more endless group chats — just simple, beautiful scheduling.
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
            </div>

            {/* Hero Image */}
            <div className="relative animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="relative">
                {/* Glow effect behind image */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 blur-3xl scale-90 opacity-60" />
                
                {/* Main image with frame */}
                <div className="relative rounded-2xl overflow-hidden shadow-soft-lg border border-border/50 bg-card">
                  <img 
                    src={heroIllustration} 
                    alt="SyncMates app showing friends connected on a calendar"
                    className="w-full h-auto"
                  />
                </div>

                {/* Floating notification cards */}
                <div className="absolute -left-4 top-1/4 animate-fade-in float-delayed" style={{ animationDelay: '0.4s' }}>
                  <div className="bg-card rounded-xl shadow-soft p-3 border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">Alex accepted!</p>
                        <p className="text-[10px] text-muted-foreground">Movie Night</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="absolute -right-4 bottom-1/4 animate-fade-in float" style={{ animationDelay: '0.6s' }}>
                  <div className="bg-card rounded-xl shadow-soft p-3 border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-xs font-medium">3 friends invited</p>
                        <p className="text-[10px] text-muted-foreground">Coffee catch-up</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              SyncMates keeps things simple while giving you powerful tools to coordinate with your crew.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="group p-6 rounded-2xl bg-card border border-border/50 card-hover animate-fade-in"
                style={{ animationDelay: `${0.1 + i * 0.1}s` }}
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-primary/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="container relative">
          <div className="max-w-2xl mx-auto text-center animate-fade-in">
            <h2 className="text-3xl font-bold mb-4">Ready to sync up?</h2>
            <p className="text-muted-foreground mb-8">
              Join SyncMates today and make planning with friends a breeze.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {["Free to use", "No credit card", "Setup in seconds"].map((item, i) => (
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
                  Create Your Account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-auto">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
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
                    onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                    className="h-8 w-8"
                  >
                    {resolvedTheme === 'dark' ? (
                      <Sun className="h-4 w-4" />
                    ) : (
                      <Moon className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 SyncMates. Made with ♥ for better planning.
          </p>
        </div>
      </footer>
    </AppLayout>
    </>
  );
}
