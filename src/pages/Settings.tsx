import { AppLayout } from "@/components/layout/AppLayout";
import { NotificationPreferencesCard } from "@/components/NotificationPreferencesCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Palette, Monitor, Sun, Moon, Keyboard, User, Mail } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <AppLayout>
      <div className="container py-8 max-w-3xl animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            Settings
          </h1>
          <p className="text-muted-foreground mt-2">
            Customize your SyncMates experience
          </p>
        </div>

        <div className="space-y-6">
          {/* Account Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account
              </CardTitle>
              <CardDescription>
                Your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user?.email || "Not logged in"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Theme Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Appearance
              </CardTitle>
              <CardDescription>
                Choose your preferred theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={theme}
                onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem value="light" id="light" className="peer sr-only" />
                  <Label
                    htmlFor="light"
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-4 hover:bg-secondary/50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                  >
                    <Sun className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Light</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                  <Label
                    htmlFor="dark"
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-4 hover:bg-secondary/50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                  >
                    <Moon className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">Dark</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="system" id="system" className="peer sr-only" />
                  <Label
                    htmlFor="system"
                    className="flex flex-col items-center justify-between rounded-lg border-2 border-muted bg-card p-4 hover:bg-secondary/50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                  >
                    <Monitor className="h-6 w-6 mb-2" />
                    <span className="text-sm font-medium">System</span>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <NotificationPreferencesCard />

          {/* Keyboard Shortcuts Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                Keyboard Shortcuts
              </CardTitle>
              <CardDescription>
                Speed up your workflow with keyboard shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={() => setShortcutsOpen(true)}
                className="w-full justify-between"
              >
                <span>View all shortcuts</span>
                <div className="flex gap-1">
                  <kbd className="px-2 py-0.5 text-xs bg-muted rounded">⌘/Ctrl</kbd>
                  <kbd className="px-2 py-0.5 text-xs bg-muted rounded">/</kbd>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </AppLayout>
  );
}
