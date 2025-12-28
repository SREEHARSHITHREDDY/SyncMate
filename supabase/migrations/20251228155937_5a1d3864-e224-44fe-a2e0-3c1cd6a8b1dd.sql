-- Create friends table for friend connections
CREATE TABLE public.friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, receiver_id)
);

-- Create events table
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event_responses table
CREATE TABLE public.event_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response TEXT NOT NULL DEFAULT 'pending' CHECK (response IN ('pending', 'yes', 'no', 'maybe')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('friend_request', 'event_invite', 'event_response')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Friends policies
CREATE POLICY "Users can view their own friend connections"
ON public.friends FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
ON public.friends FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friend requests they received"
ON public.friends FOR UPDATE
USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete their own friend connections"
ON public.friends FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

-- Events policies
CREATE POLICY "Users can view events they created or are invited to"
ON public.events FOR SELECT
USING (
  auth.uid() = creator_id OR 
  EXISTS (SELECT 1 FROM public.event_responses WHERE event_id = events.id AND user_id = auth.uid())
);

CREATE POLICY "Users can create events"
ON public.events FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own events"
ON public.events FOR UPDATE
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own events"
ON public.events FOR DELETE
USING (auth.uid() = creator_id);

-- Event responses policies
CREATE POLICY "Users can view responses for events they're part of"
ON public.event_responses FOR SELECT
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM public.events WHERE id = event_responses.event_id AND creator_id = auth.uid())
);

CREATE POLICY "Event creators can insert responses for invitees"
ON public.event_responses FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND creator_id = auth.uid()) OR
  auth.uid() = user_id
);

CREATE POLICY "Users can update their own responses"
ON public.event_responses FOR UPDATE
USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert notifications for others"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.notifications FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_friends_updated_at
BEFORE UPDATE ON public.friends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at
BEFORE UPDATE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_event_responses_updated_at
BEFORE UPDATE ON public.event_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_friends_requester ON public.friends(requester_id);
CREATE INDEX idx_friends_receiver ON public.friends(receiver_id);
CREATE INDEX idx_friends_status ON public.friends(status);
CREATE INDEX idx_events_creator ON public.events(creator_id);
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_event_responses_event ON public.event_responses(event_id);
CREATE INDEX idx_event_responses_user ON public.event_responses(user_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(is_read);