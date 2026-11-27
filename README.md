# SyncMates — Plan Together, Stay in Sync

> The social scheduling app for friend groups. Find common free time, create events, manage tasks and reminders — all in one place.

**Live:** [syncmates.in](https://syncmates.in)

---

## What is SyncMates?

SyncMates solves the #1 problem with group planning — figuring out when everyone is free. Instead of endless "when are you free?" messages, SyncMates shows you a shared availability grid so you can find a time that works for everyone and create an event in seconds.

---

## Features

### 📅 Calendar
- Day, Week, Month, and Year views
- Color-coded events by category (Class, Exam, Meeting, Work, Health, Travel, Personal, General)
- Start time + End time with duration badge on calendar blocks
- Custom color picker per event
- Create Event / Task / Reminder from a single dropdown

### ⚡ Find Free Time
- 7-day availability grid (9am – 9pm)
- Shows your busy slots and selected friends' busy slots
- Green = everyone free — click any slot to instantly schedule an event
- Tooltips show which event is blocking each slot

### 🗂️ Event Types
- **📚 Class** — lectures, tutorials, lab sessions (unlimited, always)
- **💼 Meeting** — work standups, calls, group sessions (unlimited, always)
- **🎉 Social** — hangouts, movies, trips, dinners (2/week on Free, unlimited on Pro)

### 🔗 Shareable RSVP Links
- Every event gets a public shareable link — no login required for guests
- Guests respond Going / Maybe / Can't Go with an optional note
- Creator sees all responses in the event detail view

### 🤖 AI Assistant
- Natural language event scheduling ("coffee with Sarah next Friday at 10am")
- Hands-free voice mode with text-to-speech responses
- Smart time suggestions based on your schedule
- Meeting minutes with @mentions and collaborative editing

### 📲 PWA (Install as App)
- Install SyncMates on Android / iOS / Desktop from browser
- Works offline for calendar browsing
- Push notifications via service worker

### 🗓️ Google Calendar 2-Way Sync
- Connect your Google Calendar from Settings
- Push SyncMates events to Google Calendar
- Fetch Google busy times in the Find Free Time grid

### ✅ My Tasks
- Action items assigned from meeting minutes
- Create standalone tasks and reminders with due dates
- Reminders fire as toast + native browser notifications at the set time
- Filter by priority, category, tag, due date

### 👥 Friends
- Search by name or partial email
- Send / accept / reject friend requests
- Invite friends to events directly from Create Event

### 🔔 Notifications
- Real-time notifications for friend requests, event invites, responses
- Per-notification delete + bulk clear read
- Push notifications with service worker

### 📋 Templates
- Save reusable event blueprints with title, time, category, priority, recurrence
- One-click "Use" to pre-fill Create Event form

### 💳 Pro Subscription (Razorpay)
- **Free** — unlimited classes & meetings, 2 social events/week, AI assistant (5/day)
- **Pro Monthly** — ₹99/month — unlimited everything
- **Pro Annual** — ₹999/year (~~₹99~~ ₹83.25/month) — save 16%
- Payment via Razorpay; webhook activates Pro instantly on successful payment

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Realtime + RLS) |
| Edge Functions | Supabase Edge Functions (Deno) |
| AI | Anthropic Claude via Edge Functions |
| Email | Resend |
| Payments | Razorpay (Indian market) |
| Calendar Sync | Google Calendar API (OAuth 2.0) |
| Push Notifications | Web Push / VAPID |
| PWA | Service Worker + Web App Manifest |
| Data Fetching | TanStack Query v5 |
| Deployment | Netlify (frontend) + Supabase (backend) |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- npm

### 1. Clone

```bash
git clone https://github.com/SREEHARSHITHREDDY/SyncMate.git
cd SyncMate
npm install
```

### 2. Environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

### 3. Supabase secrets (Edge Functions)

Set these in Supabase Dashboard → Edge Functions → Secrets:

```
RESEND_API_KEY
VAPID_PRIVATE_KEY
VAPID_PUBLIC_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

### 4. Apply migrations

Run each file in `supabase/migrations/` in order via Supabase SQL Editor, or:

```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

### 5. Deploy Edge Functions

```bash
supabase functions deploy ai-event-assistant --project-ref YOUR_PROJECT_ID
supabase functions deploy send-event-reminders --project-ref YOUR_PROJECT_ID
supabase functions deploy send-push-notification --project-ref YOUR_PROJECT_ID
supabase functions deploy send-transactional-email --project-ref YOUR_PROJECT_ID
supabase functions deploy share-meeting-minutes --project-ref YOUR_PROJECT_ID
supabase functions deploy google-calendar-sync --project-ref YOUR_PROJECT_ID
supabase functions deploy razorpay-create-order --project-ref YOUR_PROJECT_ID
supabase functions deploy razorpay-webhook --project-ref YOUR_PROJECT_ID
```

### 6. Razorpay webhook

In Razorpay Dashboard → Webhooks, add:
- URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/razorpay-webhook`
- Event: `payment.captured`
- Copy the webhook secret → add as `RAZORPAY_WEBHOOK_SECRET` in Supabase secrets

### 7. Run locally

```bash
npm run dev
# → http://localhost:8080
```

---

## Project Structure

```
src/
├── components/
│   ├── calendar/        # Day, Week, Month, Year views + QuickEventDialog
│   ├── layout/          # Navbar, AppLayout
│   ├── ui/              # shadcn/ui components
│   ├── GoogleCalendarCard.tsx
│   ├── PwaInstallBanner.tsx
│   └── ...
├── hooks/
│   ├── useEvents.ts
│   ├── usePlan.ts           # Free/Pro plan + weekly event count
│   ├── useGoogleCalendar.ts # OAuth + push/busy
│   ├── usePwaInstall.ts     # Install prompt
│   └── ...
├── pages/
│   ├── Pricing.tsx          # /pricing — Free vs Pro
│   ├── RsvpPage.tsx         # /rsvp/:token — public RSVP
│   ├── CreateEvent.tsx
│   ├── Dashboard.tsx
│   └── ...
├── lib/
└── integrations/supabase/

supabase/
├── functions/
│   ├── ai-event-assistant/
│   ├── google-calendar-sync/
│   ├── razorpay-create-order/
│   ├── razorpay-webhook/
│   ├── send-event-reminders/
│   ├── send-push-notification/
│   ├── send-transactional-email/
│   └── share-meeting-minutes/
└── migrations/              # 3 migrations (schema, RSVP, Google Cal, plans)
```

---

## Versions

| Version | What shipped |
|---|---|
| v1.0 | Core: calendar, events, friends, tasks, AI assistant, Find Time, 20 bug fixes |
| v1.1 | Shareable RSVP links (public guest form, no login needed) |
| v1.2 | PWA — install prompt, offline caching, app shortcuts |
| v1.3 | Google Calendar 2-way sync (OAuth, push events, fetch busy times) |
| v1.4 | Razorpay subscriptions, event types (class/meeting/social), free tier limits, pricing page |

---

## Pricing

| Plan | Price | Social events/week | AI calls/day |
|---|---|---|---|
| Free | ₹0 | 2 | 5 |
| Pro Monthly | ₹99/mo | Unlimited | Unlimited |
| Pro Annual | ₹999/yr (₹83.25/mo) | Unlimited | Unlimited |

---

## Deployment

Deployed on Netlify with continuous deployment from `main`.

Netlify environment variables:
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_ID
VITE_VAPID_PUBLIC_KEY
VITE_GOOGLE_CLIENT_ID
```

SPA routing — `public/_redirects`:
```
/*    /index.html   200
```

---

## Contributing

1. `git checkout -b feature/your-feature`
2. Make changes, commit, push
3. Open a pull request against `main`

---

## License

MIT
