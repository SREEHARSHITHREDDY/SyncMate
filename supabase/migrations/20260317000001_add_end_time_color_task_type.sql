-- Add end_time to events (optional, defaults to NULL which means start + 1hr)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS end_time time DEFAULT NULL;

-- Add color override per event (hex string like #3b82f6, overrides category color)
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS color text DEFAULT NULL;

-- Add item_type to action_items: 'task' (default) or 'reminder'
ALTER TABLE public.action_items
  ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'task'
  CHECK (item_type IN ('task', 'reminder'));

-- Add reminder_time to action_items (only meaningful when item_type = 'reminder')
ALTER TABLE public.action_items ADD COLUMN IF NOT EXISTS reminder_time time DEFAULT NULL;