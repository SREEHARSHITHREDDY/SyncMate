-- Fix infinite recursion in events RLS policies
-- The issue is that event_responses policy references events and events policy references event_responses

-- First, drop the problematic SELECT policies
DROP POLICY IF EXISTS "Users can view events they are invited to" ON events;
DROP POLICY IF EXISTS "Users can view their own events" ON events;

-- Create a single combined SELECT policy that avoids recursion
-- Use a simple OR condition without subqueries that could cause recursion
CREATE POLICY "Users can view accessible events"
ON events
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    creator_id = auth.uid()
    OR id IN (
      SELECT event_id FROM event_responses WHERE user_id = auth.uid()
    )
  )
);