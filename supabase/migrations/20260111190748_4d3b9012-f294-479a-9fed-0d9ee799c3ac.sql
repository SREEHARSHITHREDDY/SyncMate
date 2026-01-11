-- Add priority column to action_items table
ALTER TABLE public.action_items 
ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium' 
CHECK (priority IN ('low', 'medium', 'high'));

-- Create index for priority filtering
CREATE INDEX idx_action_items_priority ON public.action_items(priority);