-- Add due_date and reminder_sent columns to action_items
ALTER TABLE public.action_items 
ADD COLUMN due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN reminder_sent BOOLEAN NOT NULL DEFAULT false;