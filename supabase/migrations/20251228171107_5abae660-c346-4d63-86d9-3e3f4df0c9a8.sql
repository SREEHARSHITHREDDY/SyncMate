-- Fix infinite recursion in events RLS policies
-- Drop the problematic policy that references event_responses
DROP POLICY IF EXISTS "Users can view events they created or are invited to" ON public.events;

-- Create simpler policies without cross-table references that cause recursion
-- Policy 1: Users can view events they created
CREATE POLICY "Users can view their own events" 
ON public.events 
FOR SELECT 
USING (auth.uid() = creator_id);

-- Policy 2: Users can view events they're invited to (simplified)
CREATE POLICY "Users can view events they are invited to" 
ON public.events 
FOR SELECT 
USING (
  id IN (
    SELECT event_id FROM public.event_responses WHERE user_id = auth.uid()
  )
);