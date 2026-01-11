-- Add recurrence columns to action_items table
ALTER TABLE public.action_items 
ADD COLUMN recurrence_type TEXT DEFAULT NULL CHECK (recurrence_type IS NULL OR recurrence_type IN ('daily', 'weekly', 'monthly'));

ALTER TABLE public.action_items 
ADD COLUMN recurrence_end_date DATE DEFAULT NULL;

-- Create index for recurring tasks
CREATE INDEX idx_action_items_recurrence ON public.action_items (recurrence_type) WHERE recurrence_type IS NOT NULL;