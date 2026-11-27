-- Add event_type to events (class | meeting | event)
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'event'
  CHECK (event_type IN ('class', 'meeting', 'event'));

-- Add plan to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'pro'));

-- Subscriptions table (Razorpay)
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  razorpay_order_id   text,
  razorpay_payment_id text,
  razorpay_sub_id     text,
  plan_type           text NOT NULL CHECK (plan_type IN ('monthly', 'annual')),
  status              text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'paid', 'failed', 'cancelled')),
  amount_paise        integer NOT NULL,
  starts_at           timestamptz,
  expires_at          timestamptz,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own subscriptions" ON subscriptions;
CREATE POLICY "Users read own subscriptions"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Function to count social events this week for a user
CREATE OR REPLACE FUNCTION count_weekly_social_events(p_user_id uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer
  FROM events
  WHERE creator_id = p_user_id
    AND event_type = 'event'
    AND created_at >= date_trunc('week', now())
    AND created_at < date_trunc('week', now()) + interval '1 week';
$$ LANGUAGE sql SECURITY DEFINER;
