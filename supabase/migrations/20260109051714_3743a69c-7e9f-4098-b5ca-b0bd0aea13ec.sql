-- Fix search_profiles_by_email: Use exact match only to prevent SQL injection via wildcards
-- Also require authentication check
CREATE OR REPLACE FUNCTION public.search_profiles_by_email(search_query text)
RETURNS TABLE (
  user_id uuid,
  name text,
  email_hint text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id, 
    p.name, 
    LEFT(p.email, 2) || '***@' || SPLIT_PART(p.email, '@', 2) as email_hint
  FROM profiles p
  WHERE 
    auth.uid() IS NOT NULL  -- Require authentication
    AND p.user_id != auth.uid()  -- Exclude current user
    AND p.email = search_query  -- Exact match only - prevents SQL wildcards injection
  LIMIT 1;
$$;

-- Add UPDATE policy for push_subscriptions
CREATE POLICY "Users can update their own subscriptions"
ON public.push_subscriptions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);