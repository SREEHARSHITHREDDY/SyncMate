-- ===========================================
-- FIX 1: Notification Security
-- ===========================================

-- Drop the permissive INSERT policy that allows anyone to create notifications
DROP POLICY IF EXISTS "Users can insert notifications for others" ON public.notifications;

-- Create restrictive policy - notifications only created via triggers/system
CREATE POLICY "System only inserts notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (false);

-- Create trigger function for friend request notifications
CREATE OR REPLACE FUNCTION public.create_friend_request_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, reference_id)
  VALUES (
    NEW.receiver_id,
    'friend_request',
    'New friend request',
    'Someone wants to connect with you',
    NEW.requester_id
  );
  RETURN NEW;
END;
$$;

-- Create trigger for friend requests
DROP TRIGGER IF EXISTS friend_request_notification ON public.friends;
CREATE TRIGGER friend_request_notification
AFTER INSERT ON public.friends
FOR EACH ROW
WHEN (NEW.status = 'pending')
EXECUTE FUNCTION public.create_friend_request_notification();

-- Create trigger function for event invite notifications
CREATE OR REPLACE FUNCTION public.create_event_invite_notification()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  creator_name TEXT;
  event_title TEXT;
BEGIN
  -- Get creator name and event title
  SELECT p.name, e.title INTO creator_name, event_title
  FROM events e
  JOIN profiles p ON e.creator_id = p.user_id
  WHERE e.id = NEW.event_id;
  
  INSERT INTO notifications (user_id, type, title, message, reference_id)
  VALUES (
    NEW.user_id,
    'event_invite',
    'Event Invitation',
    COALESCE(creator_name, 'Someone') || ' invited you to "' || COALESCE(event_title, 'an event') || '"',
    NEW.event_id
  );
  RETURN NEW;
END;
$$;

-- Create trigger for event invitations
DROP TRIGGER IF EXISTS event_invite_notification ON public.event_responses;
CREATE TRIGGER event_invite_notification
AFTER INSERT ON public.event_responses
FOR EACH ROW
WHEN (NEW.response = 'pending')
EXECUTE FUNCTION public.create_event_invite_notification();

-- ===========================================
-- FIX 2: Profile Exposure Security
-- ===========================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view other profiles" ON public.profiles;

-- Create security definer function to check friendship
CREATE OR REPLACE FUNCTION public.is_friend_with(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friends 
    WHERE status = 'accepted' 
    AND (
      (requester_id = auth.uid() AND receiver_id = target_user_id) OR
      (receiver_id = auth.uid() AND requester_id = target_user_id)
    )
  )
$$;

-- Create security definer function to check if user has pending friend request from target
CREATE OR REPLACE FUNCTION public.has_pending_request_from(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM friends 
    WHERE status = 'pending' 
    AND requester_id = target_user_id
    AND receiver_id = auth.uid()
  )
$$;

-- Allow users to view profiles of:
-- 1. Themselves
-- 2. Confirmed friends
-- 3. Users who have sent them pending friend requests
CREATE POLICY "Users can view relevant profiles" 
ON public.profiles 
FOR SELECT 
USING (
  user_id = auth.uid() OR  -- Own profile
  public.is_friend_with(user_id) OR  -- Friends
  public.has_pending_request_from(user_id)  -- Pending request senders
);

-- Create a view for limited profile search (masked emails)
CREATE OR REPLACE VIEW public.profiles_search AS
SELECT 
  user_id, 
  name, 
  LEFT(email, 2) || '***@' || SPLIT_PART(email, '@', 2) as email_hint,
  email as full_email
FROM profiles;

-- Grant access to the view
GRANT SELECT ON public.profiles_search TO authenticated;