-- Fix infinite recursion by using a SECURITY DEFINER function
-- This breaks the policy chain by executing with elevated privileges

-- First drop the problematic policy
DROP POLICY IF EXISTS "Users can view accessible events" ON events;

-- Create a security definer function that checks event participation
-- This function runs with the privileges of the function owner, not the calling user
-- which breaks the recursive policy evaluation chain
CREATE OR REPLACE FUNCTION public.is_event_participant(event_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM event_responses 
    WHERE event_id = event_uuid AND user_id = user_uuid
  );
$$;

-- Now create the SELECT policy using the function
CREATE POLICY "Users can view accessible events"
ON events
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    creator_id = auth.uid()
    OR is_event_participant(id, auth.uid())
  )
);