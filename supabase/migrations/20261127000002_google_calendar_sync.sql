-- Store Google OAuth tokens per user (encrypted at rest by Supabase)
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  access_token    text NOT NULL,
  refresh_token   text NOT NULL,
  expires_at      timestamptz NOT NULL,
  scope           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE google_calendar_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own tokens
CREATE POLICY "Users manage own google tokens"
  ON google_calendar_tokens
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Track which SyncMates events have been synced to Google Calendar
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_synced_at timestamptz;
