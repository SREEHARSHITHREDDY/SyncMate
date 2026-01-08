-- Fix the SECURITY DEFINER view issue by using a function-based approach instead

-- Drop the problematic view
DROP VIEW IF EXISTS public.profiles_search;

-- Create a security definer function for safe profile search
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
    p.user_id != auth.uid()  -- Exclude current user
    AND p.email ILIKE '%' || search_query || '%'
  LIMIT 10;
$$;