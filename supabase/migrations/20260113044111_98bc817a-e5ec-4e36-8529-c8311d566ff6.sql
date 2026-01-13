-- Create calendar_permissions table for managing calendar sharing between friends
CREATE TABLE public.calendar_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  viewer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  view_from_date DATE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, viewer_id)
);

-- Enable Row Level Security
ALTER TABLE public.calendar_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view permissions where they are owner or viewer
CREATE POLICY "Users can view their calendar permissions"
ON public.calendar_permissions
FOR SELECT
USING (auth.uid() IS NOT NULL AND (auth.uid() = owner_id OR auth.uid() = viewer_id));

-- Policy: Users can request permission (insert as viewer)
CREATE POLICY "Users can request calendar permission"
ON public.calendar_permissions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = viewer_id);

-- Policy: Calendar owners can update permission status and date restrictions
CREATE POLICY "Calendar owners can update permissions"
ON public.calendar_permissions
FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = owner_id);

-- Policy: Either party can delete (revoke) the permission
CREATE POLICY "Users can delete their calendar permissions"
ON public.calendar_permissions
FOR DELETE
USING (auth.uid() IS NOT NULL AND (auth.uid() = owner_id OR auth.uid() = viewer_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_calendar_permissions_updated_at
BEFORE UPDATE ON public.calendar_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a function to check if user can view another user's calendar
CREATE OR REPLACE FUNCTION public.can_view_calendar(target_user_id UUID)
RETURNS BOOLEAN
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
  );
END;
$$;