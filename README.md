# SyncMates — Plan Together, Stay in Sync

> The social scheduling app for friend groups. Find common free time, create events, manage tasks and reminders — all in one place.

**Live:** [sync-mate.netlify.app](https://sync-mate.netlify.app)

---

## What is SyncMates?

SyncMates solves the #1 problem with group planning — figuring out when everyone is free. Instead of endless "when are you free?" messages, SyncMates shows you a shared availability grid so you can find a time that works for everyone and create an event instantly.

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

### ✅ My Tasks
- Action items assigned from meeting minutes
- Create standalone tasks and reminders with due dates
- Reminders fire as toast notifications + native browser notifications at the set time
- Drag to reorder, bulk complete, bulk delete
- Filter by priority, category, tag, due date

### 👥 Friends
- Search by name or partial email
- Send / accept / reject friend requests
- Invite friends to events directly from Create Event

### 🤖 AI Assistant
- Natural language event scheduling ("coffee with Sarah next Friday at 10am")
- Hands-free voice mode with text-to-speech responses
- Smart time suggestions based on your schedule
- Meeting minutes with @mentions and collaborative editing

### 🔔 Notifications
- Real-time notifications for friend requests, event invites, responses
- Per-notification delete + bulk clear read
- Push notifications (with service worker)

### 📋 Templates
- Save reusable event blueprints with title, time, category, priority, recurrence
- One-click "Use" to pre-fill Create Event form

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| AI | Anthropic Claude via Supabase Edge Functions |
| Email | Resend |
| Drag & Drop | dnd-kit |
| Data Fetching | TanStack Query |
| Deployment | Netlify |

---

## Getting Started

### Prerequisites
- Node.js 18+ (install with [nvm](https://github.com/nvm-sh/nvm))
- A [Supabase](https://supabase.com) project
- npm or yarn

### 1. Clone the repo

```bash
git clone https://github.com/SREEHARSHITHREDDY/SyncMate.git
cd SyncMate
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
```

You can find your Supabase URL and anon key at:
`supabase.com/dashboard/project/YOUR_PROJECT_ID/settings/api`

### 4. Apply database migrations

```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:8080](http://localhost:8080)

---

## Deployment

The app is deployed on Netlify with continuous deployment from the `main` branch.

### Environment variables (Netlify)

Set these in Netlify → Site configuration → Environment variables:

```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_VAPID_PUBLIC_KEY
```

### SPA Routing

The `public/_redirects` file handles client-side routing:
```
/*    /index.html   200
```

---

## Project Structure

```
src/
├── components/
│   ├── calendar/        # Day, Week, Month, Year views
│   ├── layout/          # Navbar, AppLayout
│   ├── ui/              # shadcn/ui components
│   ├── AIEventAssistant.tsx
│   ├── CreateTaskDialog.tsx
│   ├── EditEventDialog.tsx
│   ├── EventCard.tsx
│   └── ...
├── hooks/               # Data fetching and business logic
├── pages/               # Route-level components
├── lib/                 # Utilities, categories, colors
└── integrations/
    └── supabase/        # Supabase client + types
supabase/
├── functions/           # Edge Functions (AI, email, push)
└── migrations/          # Database schema (29 migrations)
```

---

## Versions

| Version | Description |
|---|---|
| v1.0 | Core features — calendar, events, friends, tasks, AI assistant, Find Time, 20 bug fixes |

---

## Local Development Tips

```bash
# Run dev server
npm run dev

# Type check
npm run type-check

# Build for production
npm run build

# Push DB migrations
supabase db push

# Deploy edge functions
supabase functions deploy ai-event-assistant
supabase functions deploy send-event-reminders
```

---

## Contributing

1. Create a branch: `git checkout -b feature/your-feature`
2. Make your changes and commit
3. Push and open a pull request against `main`

---

## License

MIT
