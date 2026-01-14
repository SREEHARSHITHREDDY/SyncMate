-- Drop existing check constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new check constraint with calendar_request type included
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY['friend_request'::text, 'event_invite'::text, 'event_response'::text, 'calendar_request'::text, 'action_item'::text, 'mention'::text, 'action_item_overdue'::text]));