-- Create function to send calendar permission notifications
CREATE OR REPLACE FUNCTION public.notify_calendar_permission_request()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify owner when someone requests calendar access
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id)
    VALUES (
      NEW.owner_id,
      'calendar_request',
      'Calendar Access Request',
      'Someone has requested access to view your calendar.',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create function to notify viewer when access is granted
CREATE OR REPLACE FUNCTION public.notify_calendar_permission_granted()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify viewer when their request is accepted
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, type, title, message, reference_id)
    VALUES (
      NEW.viewer_id,
      'calendar_granted',
      'Calendar Access Granted',
      'Your calendar access request has been approved!',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new calendar permission requests
CREATE TRIGGER on_calendar_permission_request
  AFTER INSERT ON public.calendar_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_calendar_permission_request();

-- Create trigger for calendar permission updates (granted)
CREATE TRIGGER on_calendar_permission_granted
  AFTER UPDATE ON public.calendar_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_calendar_permission_granted();