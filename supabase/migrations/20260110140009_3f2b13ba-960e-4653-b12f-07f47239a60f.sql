-- Create table for meeting minutes
CREATE TABLE public.meeting_minutes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

-- Policy: Event creator can manage minutes
CREATE POLICY "Event creators can manage meeting minutes"
ON public.meeting_minutes
FOR ALL
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.events 
    WHERE events.id = meeting_minutes.event_id 
    AND events.creator_id = auth.uid()
  )
);

-- Policy: Event participants can view minutes
CREATE POLICY "Event participants can view meeting minutes"
ON public.meeting_minutes
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = meeting_minutes.event_id 
      AND events.creator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.event_responses 
      WHERE event_responses.event_id = meeting_minutes.event_id 
      AND event_responses.user_id = auth.uid()
    )
  )
);

-- Policy: Participants can also add minutes
CREATE POLICY "Event participants can add meeting minutes"
ON public.meeting_minutes
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = created_by AND
  (
    EXISTS (
      SELECT 1 FROM public.events 
      WHERE events.id = meeting_minutes.event_id 
      AND events.creator_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.event_responses 
      WHERE event_responses.event_id = meeting_minutes.event_id 
      AND event_responses.user_id = auth.uid()
      AND event_responses.response = 'yes'
    )
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_meeting_minutes_updated_at
BEFORE UPDATE ON public.meeting_minutes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();