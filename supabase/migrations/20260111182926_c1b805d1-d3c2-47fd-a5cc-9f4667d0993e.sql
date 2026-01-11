-- Create action_items table for meeting minutes
CREATE TABLE public.action_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    minute_id UUID NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    assignee_id UUID,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.action_items ENABLE ROW LEVEL SECURITY;

-- Create policies for action items
-- Users can view action items for events they created or are invited to
CREATE POLICY "Users can view action items for accessible events"
ON public.action_items
FOR SELECT
USING (
    auth.uid() IS NOT NULL AND (
        -- Event creator
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = action_items.event_id
            AND events.creator_id = auth.uid()
        )
        OR
        -- Confirmed participant
        EXISTS (
            SELECT 1 FROM public.event_responses
            WHERE event_responses.event_id = action_items.event_id
            AND event_responses.user_id = auth.uid()
            AND event_responses.response = 'accepted'
        )
        OR
        -- Assignee
        action_items.assignee_id = auth.uid()
    )
);

-- Users can create action items for events they can access
CREATE POLICY "Users can create action items"
ON public.action_items
FOR INSERT
WITH CHECK (
    auth.uid() IS NOT NULL AND
    auth.uid() = created_by AND (
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = action_items.event_id
            AND events.creator_id = auth.uid()
        )
        OR
        EXISTS (
            SELECT 1 FROM public.event_responses
            WHERE event_responses.event_id = action_items.event_id
            AND event_responses.user_id = auth.uid()
            AND event_responses.response = 'accepted'
        )
    )
);

-- Users can update action items they created or are assigned to
CREATE POLICY "Users can update action items"
ON public.action_items
FOR UPDATE
USING (
    auth.uid() IS NOT NULL AND (
        created_by = auth.uid() OR
        assignee_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = action_items.event_id
            AND events.creator_id = auth.uid()
        )
    )
);

-- Users can delete action items they created or as event creator
CREATE POLICY "Users can delete action items"
ON public.action_items
FOR DELETE
USING (
    auth.uid() IS NOT NULL AND (
        created_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.events
            WHERE events.id = action_items.event_id
            AND events.creator_id = auth.uid()
        )
    )
);

-- Create updated_at trigger
CREATE TRIGGER update_action_items_updated_at
    BEFORE UPDATE ON public.action_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for action items
ALTER PUBLICATION supabase_realtime ADD TABLE public.action_items;