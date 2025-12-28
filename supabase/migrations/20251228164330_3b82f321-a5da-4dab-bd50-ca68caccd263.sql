-- Create event_exceptions table for cancelled occurrences
CREATE TABLE public.event_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, exception_date)
);

-- Enable RLS
ALTER TABLE public.event_exceptions ENABLE ROW LEVEL SECURITY;

-- Policies for event_exceptions
CREATE POLICY "Event creators can view exceptions"
ON public.event_exceptions
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.events
  WHERE events.id = event_exceptions.event_id
  AND events.creator_id = auth.uid()
));

CREATE POLICY "Event creators can insert exceptions"
ON public.event_exceptions
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.events
  WHERE events.id = event_exceptions.event_id
  AND events.creator_id = auth.uid()
));

CREATE POLICY "Event creators can delete exceptions"
ON public.event_exceptions
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.events
  WHERE events.id = event_exceptions.event_id
  AND events.creator_id = auth.uid()
));

-- Create notification_preferences table
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  remind_1_hour BOOLEAN NOT NULL DEFAULT true,
  remind_1_day BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies for notification_preferences
CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
ON public.notification_preferences
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences
FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();