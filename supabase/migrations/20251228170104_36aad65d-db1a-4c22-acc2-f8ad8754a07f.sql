-- Add is_completed column to events table for marking events as done
ALTER TABLE public.events ADD COLUMN is_completed boolean NOT NULL DEFAULT false;

-- Add index for faster filtering
CREATE INDEX idx_events_is_completed ON public.events(is_completed);