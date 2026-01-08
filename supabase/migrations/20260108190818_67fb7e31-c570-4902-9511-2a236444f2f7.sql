-- Fix profiles RLS: require authentication for SELECT policies
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create combined SELECT policy with authentication requirement
CREATE POLICY "Authenticated users can view relevant profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND (
    user_id = auth.uid() 
    OR is_friend_with(user_id) 
    OR has_pending_request_from(user_id)
  )
);

-- Add DELETE policy for profiles (GDPR compliance)
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for notification_preferences
CREATE POLICY "Users can delete their own preferences"
ON public.notification_preferences
FOR DELETE
USING (auth.uid() = user_id);

-- Add DELETE policy for event_responses
CREATE POLICY "Users can delete their own responses"
ON public.event_responses
FOR DELETE
USING (auth.uid() = user_id);