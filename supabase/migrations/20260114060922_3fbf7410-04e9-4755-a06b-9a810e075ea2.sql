-- Add expires_at column for calendar permission expiration
ALTER TABLE public.calendar_permissions 
ADD COLUMN expires_at DATE NULL;

-- Update can_view_calendar function to check expiration
CREATE OR REPLACE FUNCTION public.can_view_calendar(target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM calendar_permissions
    WHERE owner_id = target_user_id
      AND viewer_id = auth.uid()
      AND status = 'accepted'
      AND (view_from_date IS NULL OR view_from_date <= CURRENT_DATE)
      AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
  );
END;
$$;