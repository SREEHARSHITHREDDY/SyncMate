-- Add tags column to action_items table
ALTER TABLE public.action_items 
ADD COLUMN tags TEXT[] DEFAULT '{}';

-- Add sort_order column for drag-and-drop ordering
ALTER TABLE public.action_items 
ADD COLUMN sort_order INTEGER DEFAULT 0;

-- Create index for faster tag queries
CREATE INDEX idx_action_items_tags ON public.action_items USING GIN(tags);

-- Create index for sort order
CREATE INDEX idx_action_items_sort_order ON public.action_items (assignee_id, sort_order);

-- Update existing items with incremental sort order
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY assignee_id ORDER BY created_at) as rn
  FROM public.action_items
)
UPDATE public.action_items 
SET sort_order = numbered.rn
FROM numbered
WHERE action_items.id = numbered.id;