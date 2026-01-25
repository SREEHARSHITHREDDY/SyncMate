-- Add is_private column to events table
ALTER TABLE public.events 
ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- Add a comment for documentation
COMMENT ON COLUMN public.events.is_private IS 'When true, this event is hidden from shared calendar views';