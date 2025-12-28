-- Add recurrence columns to events table
ALTER TABLE public.events 
ADD COLUMN recurrence_type TEXT DEFAULT NULL,
ADD COLUMN recurrence_end_date DATE DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.events.recurrence_type IS 'none, daily, weekly, monthly';
COMMENT ON COLUMN public.events.recurrence_end_date IS 'Date when recurrence ends';