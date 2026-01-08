-- Add UPDATE policy for event_exceptions table
CREATE POLICY "Event creators can update exceptions"
ON public.event_exceptions
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM events
  WHERE events.id = event_exceptions.event_id
  AND events.creator_id = auth.uid()
));