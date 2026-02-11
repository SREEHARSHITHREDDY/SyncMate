
-- Availability slots: each invited member can mark time slots as available
CREATE TABLE public.availability_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  slot_date DATE NOT NULL,
  slot_start TIME NOT NULL,
  slot_end TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id, slot_date, slot_start, slot_end)
);

ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view availability for events they participate in"
ON public.availability_slots FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.creator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM event_responses WHERE event_responses.event_id = availability_slots.event_id AND event_responses.user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert their own availability"
ON public.availability_slots FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.creator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM event_responses WHERE event_responses.event_id = availability_slots.event_id AND event_responses.user_id = auth.uid())
  )
);

CREATE POLICY "Users can delete their own availability"
ON public.availability_slots FOR DELETE
USING (auth.uid() = user_id);

-- Commitment status: Confirmed / Tentative / Not Available per member per event
-- We'll add a commitment_status column to event_responses
ALTER TABLE public.event_responses ADD COLUMN IF NOT EXISTS commitment_status TEXT NOT NULL DEFAULT 'pending'
  CHECK (commitment_status IN ('confirmed', 'tentative', 'not_available', 'pending'));

-- Plan lifecycle status on events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'proposed'
  CHECK (lifecycle_status IN ('proposed', 'availability_collected', 'suggested', 'confirmed', 'frozen', 'completed'));

-- Suggested time slot (best slot) on events
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS suggested_date DATE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS suggested_start_time TIME;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS suggested_end_time TIME;

-- Freeze mechanism columns
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS is_frozen BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS frozen_at TIMESTAMPTZ;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS frozen_by UUID;

-- Change history log for frozen plans
CREATE TABLE public.plan_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  change_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approvals_needed INT NOT NULL DEFAULT 0,
  approvals_received INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.plan_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view change requests"
ON public.plan_change_requests FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.creator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM event_responses WHERE event_responses.event_id = plan_change_requests.event_id AND event_responses.user_id = auth.uid())
  )
);

CREATE POLICY "Participants can create change requests"
ON public.plan_change_requests FOR INSERT
WITH CHECK (
  auth.uid() = requested_by AND (
    EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.creator_id = auth.uid())
    OR EXISTS (SELECT 1 FROM event_responses WHERE event_responses.event_id = plan_change_requests.event_id AND event_responses.user_id = auth.uid())
  )
);

CREATE POLICY "Creator can update change requests"
ON public.plan_change_requests FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM events WHERE events.id = event_id AND events.creator_id = auth.uid())
);

-- Change request votes
CREATE TABLE public.change_request_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  change_request_id UUID NOT NULL REFERENCES public.plan_change_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(change_request_id, user_id)
);

ALTER TABLE public.change_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view votes"
ON public.change_request_votes FOR SELECT
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM plan_change_requests pcr
    JOIN events e ON e.id = pcr.event_id
    WHERE pcr.id = change_request_id
    AND (e.creator_id = auth.uid() OR EXISTS (
      SELECT 1 FROM event_responses er WHERE er.event_id = e.id AND er.user_id = auth.uid()
    ))
  )
);

CREATE POLICY "Participants can vote"
ON public.change_request_votes FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM plan_change_requests pcr
    JOIN events e ON e.id = pcr.event_id
    WHERE pcr.id = change_request_id
    AND (e.creator_id = auth.uid() OR EXISTS (
      SELECT 1 FROM event_responses er WHERE er.event_id = e.id AND er.user_id = auth.uid()
    ))
  )
);

-- Enable realtime for availability_slots so the grid updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.availability_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.plan_change_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.change_request_votes;
