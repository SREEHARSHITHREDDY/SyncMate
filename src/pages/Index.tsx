import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Clock, ArrowRight, Check } from "lucide-react";

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
  return (
    <AppLayout isAuthenticated={false}>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="container relative py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Calendar className="h-4 w-4" />
              Social scheduling, simplified
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Plan together,
              <br />
              <span className="text-primary">stay in sync</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              SyncMates makes it easy to coordinate events with friends. 
              No more endless group chats — just simple, beautiful scheduling.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth">
                <Button size="lg" className="gap-2 w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Demo
                </Button>
              </Link>
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
                className="p-6 rounded-2xl bg-card border border-border/50 card-hover animate-fade-in"
                style={{ animationDelay: `${0.1 + i * 0.1}s` }}
              >
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
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
      <section className="py-20">
        <div className="container">
          <div className="max-w-2xl mx-auto text-center animate-fade-in">
            <h2 className="text-3xl font-bold mb-4">Ready to sync up?</h2>
            <p className="text-muted-foreground mb-8">
              Join SyncMates today and make planning with friends a breeze.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {["Free to use", "No credit card", "Setup in seconds"].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
                  {item}
                </div>
              ))}
            </div>
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Create Your Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <span className="font-semibold">SyncMates</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 SyncMates. Made with ♥ for better planning.
          </p>
        </div>
      </footer>
    </AppLayout>
  );
}
