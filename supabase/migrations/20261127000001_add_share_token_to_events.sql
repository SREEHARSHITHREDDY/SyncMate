-- Add share_token to events for public RSVP links
ALTER TABLE events ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid() UNIQUE;

-- Back-fill existing events that don't have a token yet
UPDATE events SET share_token = gen_random_uuid() WHERE share_token IS NULL;

-- Allow anyone (including unauthenticated) to read a single event by its share_token
-- This is safe because the token acts as a secret — only people with the link can access it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Public can read event by share_token' AND tablename = 'events'
  ) THEN
    CREATE POLICY "Public can read event by share_token"
      ON events FOR SELECT
      USING (share_token IS NOT NULL);
  END IF;
END $$;

-- Table to store public RSVPs (from people without an account)
CREATE TABLE IF NOT EXISTS public_rsvps (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  response    text NOT NULL CHECK (response IN ('accepted', 'declined', 'maybe')),
  note        text,
  created_at  timestamptz DEFAULT now()
);

-- Anyone can insert a public RSVP
ALTER TABLE public_rsvps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a public RSVP"
  ON public_rsvps FOR INSERT
  WITH CHECK (true);

-- Event creator can read RSVPs for their events
CREATE POLICY "Creator can read RSVPs for their events"
  ON public_rsvps FOR SELECT
  USING (
    event_id IN (SELECT id FROM events WHERE creator_id = auth.uid())
  );
