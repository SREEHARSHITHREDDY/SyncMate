import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, CheckCircle, Loader2, LogOut, RefreshCw } from "lucide-react";

export function GoogleCalendarCard() {
  const { connected, loading, connect, disconnect } = useGoogleCalendar();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {/* Google Calendar colour icon */}
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" fill="#fff" stroke="#dadce0" />
            <rect x="3" y="3" width="18" height="5" rx="2" fill="#1a73e8" />
            <text x="12" y="17" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#1a73e8">
              {new Date().getDate()}
            </text>
          </svg>
          Google Calendar
          {connected && (
            <Badge className="ml-1 bg-green-100 text-green-700 border-green-200 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" /> Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {connected
            ? "Your SyncMates events sync to Google Calendar. Your Google busy times are used when finding free slots."
            : "Connect to automatically sync events and use your Google Calendar availability."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
          </div>
        ) : connected ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-sm text-muted-foreground bg-secondary/40 rounded-lg p-3">
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-foreground font-medium">2-way sync active</p>
                <p className="text-xs mt-0.5">New events you create on SyncMates will appear in Google Calendar. Your busy slots from Google Calendar are factored in when finding free time.</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
              onClick={disconnect}
            >
              <LogOut className="h-4 w-4" /> Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li className="flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 text-blue-500" /> Events you create sync to Google Calendar</li>
              <li className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-blue-500" /> Your Google busy times used in Find Time</li>
            </ul>
            <Button
              onClick={connect}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Connect Google Calendar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
