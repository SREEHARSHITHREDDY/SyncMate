import { Link, useLocation } from "react-router-dom";
import { Calendar, Users, Bell, Plus, LayoutDashboard, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NavbarProps {
  isAuthenticated?: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/friends", label: "Friends", icon: Users },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function Navbar({ isAuthenticated = false }: NavbarProps) {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105">
            <Calendar className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight">SyncMates</span>
        </Link>

        {/* Navigation */}
        {isAuthenticated ? (
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    "nav-link flex items-center gap-2",
                    isActive && "active"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}

        {/* Actions */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link to="/create-event">
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Event</span>
                </Button>
              </Link>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">U</span>
              </div>
            </>
          ) : (
            <Link to="/auth">
              <Button variant="default" size="sm" className="gap-2">
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
