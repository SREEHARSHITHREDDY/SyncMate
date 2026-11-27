import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, User, CheckCircle, XCircle, HelpCircle } from "lucide-react";
import { toast } from "sonner";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string;
  end_time: string | null;
  location: string | null;
  color: string | null;
  creator_id: string;
}

type RSVPResponse = "accepted" | "declined" | "maybe";

export default function RsvpPage() {
  const { token } = useParams<{ token: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [response, setResponse] = useState<RSVPResponse | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    const fetchEvent = async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, description, event_date, event_time, end_time, location, color, creator_id")
        .eq("share_token", token)
        .single();

      if (error || !data) {
        setNotFound(true);
      } else {
        setEvent(data as EventData);
      }
      setLoading(false);
    };

    fetchEvent();
  }, [token]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (timeStr: string) => timeStr.slice(0, 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!response) {
      toast.error("Please select your RSVP response");
      return;
    }
    if (!event) return;

    setSubmitting(true);
    const { error } = await supabase.from("public_rsvps").insert({
      event_id: event.id,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      response,
      note: note.trim() || null,
    });

    if (error) {
      console.error("RSVP error:", error);
      toast.error("Failed to submit RSVP. Please try again.");
    } else {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading event details…</p>
        </div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-8 pb-8">
            <XCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
            <p className="text-gray-600 mb-6">
              This link is invalid or the event may have been removed.
            </p>
            <a href="https://syncmates.in" className="text-blue-600 hover:underline font-medium">
              Go to SyncMates →
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    const responseLabels: Record<RSVPResponse, { label: string; icon: React.ReactNode; color: string }> = {
      accepted: { label: "Going", icon: <CheckCircle className="h-16 w-16 text-green-500" />, color: "text-green-700" },
      declined: { label: "Can't make it", icon: <XCircle className="h-16 w-16 text-red-400" />, color: "text-red-700" },
      maybe: { label: "Maybe", icon: <HelpCircle className="h-16 w-16 text-yellow-500" />, color: "text-yellow-700" },
    };
    const res = responseLabels[response!];

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full text-center shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="mb-4">{res.icon}</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">RSVP Submitted!</h1>
            <p className={`text-lg font-semibold mb-2 ${res.color}`}>{res.label}</p>
            <p className="text-gray-600 mb-1">
              You said <strong>{res.label.toLowerCase()}</strong> for
            </p>
            <p className="text-gray-900 font-semibold mb-6">{event.title}</p>
            <p className="text-gray-500 text-sm mb-6">
              A confirmation has been noted. We'll keep you posted if anything changes.
            </p>
            <a href="https://syncmates.in" className="text-blue-600 hover:underline font-medium text-sm">
              Powered by SyncMates →
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const responseOptions: { value: RSVPResponse; label: string; icon: React.ReactNode; active: string; inactive: string }[] = [
    {
      value: "accepted",
      label: "Going",
      icon: <CheckCircle className="h-5 w-5" />,
      active: "bg-green-600 text-white border-green-600 shadow-md",
      inactive: "bg-white text-green-700 border-green-300 hover:bg-green-50",
    },
    {
      value: "maybe",
      label: "Maybe",
      icon: <HelpCircle className="h-5 w-5" />,
      active: "bg-yellow-500 text-white border-yellow-500 shadow-md",
      inactive: "bg-white text-yellow-700 border-yellow-300 hover:bg-yellow-50",
    },
    {
      value: "declined",
      label: "Can't Go",
      icon: <XCircle className="h-5 w-5" />,
      active: "bg-red-500 text-white border-red-500 shadow-md",
      inactive: "bg-white text-red-700 border-red-300 hover:bg-red-50",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <a href="https://syncmates.in" className="inline-flex items-center gap-2 text-blue-700 font-bold text-lg mb-2">
            <CalendarDays className="h-5 w-5" /> SyncMates
          </a>
          <p className="text-gray-500 text-sm">You've been invited to an event</p>
        </div>

        {/* Event Card */}
        <Card className="shadow-lg border-0">
          <div
            className="h-2 rounded-t-xl"
            style={{ backgroundColor: event.color || "#6366f1" }}
          />
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl font-bold text-gray-900">{event.title}</CardTitle>
            {event.description && (
              <p className="text-gray-600 text-sm leading-relaxed mt-1">{event.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <CalendarDays className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-sm font-medium">{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Clock className="h-4 w-4 text-blue-500 shrink-0" />
              <span className="text-sm font-medium">
                {formatTime(event.event_time)}
                {event.end_time && <> → {formatTime(event.end_time)}</>}
              </span>
            </div>
            {event.location && (
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="h-4 w-4 text-blue-500 shrink-0" />
                <span className="text-sm font-medium">{event.location}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RSVP Form */}
        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-blue-500" /> Your RSVP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Are you coming? *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {responseOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setResponse(opt.value)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border-2 transition-all text-sm font-semibold ${
                        response === opt.value ? opt.active : opt.inactive
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">Note (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Anything you'd like the organizer to know…"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !response}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5"
              >
                {submitting ? "Submitting…" : "Submit RSVP"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-gray-400 text-xs">
          Powered by{" "}
          <a href="https://syncmates.in" className="hover:underline text-blue-400">
            SyncMates
          </a>{" "}
          — Free group scheduling
        </p>
      </div>
    </div>
  );
}
