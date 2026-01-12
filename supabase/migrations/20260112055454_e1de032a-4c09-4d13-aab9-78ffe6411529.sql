-- Fix events INSERT policy - change from RESTRICTIVE to PERMISSIVE
DROP POLICY IF EXISTS "Users can create events" ON events;
CREATE POLICY "Users can create events"
ON events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = creator_id);

-- Fix events UPDATE policy  
DROP POLICY IF EXISTS "Users can update their own events" ON events;
CREATE POLICY "Users can update their own events"
ON events
FOR UPDATE
TO authenticated
USING (auth.uid() = creator_id);

-- Fix events DELETE policy
DROP POLICY IF EXISTS "Users can delete their own events" ON events;
CREATE POLICY "Users can delete their own events"
ON events
FOR DELETE
TO authenticated
USING (auth.uid() = creator_id);

-- Fix friends policies - make them PERMISSIVE
DROP POLICY IF EXISTS "Users can send friend requests" ON friends;
CREATE POLICY "Users can send friend requests"
ON friends
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can view their own friend connections" ON friends;
CREATE POLICY "Users can view their own friend connections"
ON friends
FOR SELECT
TO authenticated
USING ((auth.uid() = requester_id) OR (auth.uid() = receiver_id));

DROP POLICY IF EXISTS "Users can update friend requests they received" ON friends;
CREATE POLICY "Users can update friend requests they received"
ON friends
FOR UPDATE
TO authenticated
USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can delete their own friend connections" ON friends;
CREATE POLICY "Users can delete their own friend connections"
ON friends
FOR DELETE
TO authenticated
USING ((auth.uid() = requester_id) OR (auth.uid() = receiver_id));

-- Add category column to events table for color coding
ALTER TABLE events ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'default';

-- Add category column to event_templates as well
ALTER TABLE event_templates ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'default';