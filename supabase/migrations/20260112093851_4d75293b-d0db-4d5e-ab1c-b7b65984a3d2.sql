-- Create secure RPC functions for notification creation

-- Function to create action item assignment notification
CREATE OR REPLACE FUNCTION public.create_action_item_notification(
  p_assignee_id uuid,
  p_event_id uuid,
  p_action_item_content text,
  p_due_date timestamp with time zone DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_title text;
  v_creator_name text;
  v_message text;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Don't create notification if assigning to self
  IF p_assignee_id = auth.uid() THEN
    RETURN;
  END IF;

  -- Verify the event exists and user has access
  SELECT title INTO v_event_title
  FROM events
  WHERE id = p_event_id
    AND (creator_id = auth.uid() OR is_event_participant(p_event_id, auth.uid()));
  
  IF v_event_title IS NULL THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;

  -- Get creator name
  SELECT name INTO v_creator_name
  FROM profiles
  WHERE user_id = auth.uid();

  -- Build message (sanitize input by using parameterized query)
  v_message := COALESCE(v_creator_name, 'Someone') || ' assigned you an action item in "' || v_event_title || '"';
  
  IF p_due_date IS NOT NULL THEN
    v_message := v_message || ' (due ' || to_char(p_due_date, 'Mon DD, YYYY') || ')';
  END IF;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, message, reference_id)
  VALUES (p_assignee_id, 'action_item', 'New action item assigned', v_message, p_event_id);
END;
$$;

-- Function to create mention notifications for meeting minutes
CREATE OR REPLACE FUNCTION public.create_mention_notification(
  p_event_id uuid,
  p_mentioned_user_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_title text;
  v_mentioner_name text;
  v_mentioned_user_id uuid;
BEGIN
  -- Verify caller is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify the event exists and user has access
  SELECT title INTO v_event_title
  FROM events
  WHERE id = p_event_id
    AND (creator_id = auth.uid() OR is_event_participant(p_event_id, auth.uid()));
  
  IF v_event_title IS NULL THEN
    RAISE EXCEPTION 'Event not found or access denied';
  END IF;

  -- Get mentioner name
  SELECT name INTO v_mentioner_name
  FROM profiles
  WHERE user_id = auth.uid();

  -- Create notifications for each mentioned user (excluding self)
  FOREACH v_mentioned_user_id IN ARRAY p_mentioned_user_ids
  LOOP
    IF v_mentioned_user_id != auth.uid() THEN
      INSERT INTO notifications (user_id, type, title, message, reference_id)
      VALUES (
        v_mentioned_user_id,
        'mention',
        'You were mentioned',
        COALESCE(v_mentioner_name, 'Someone') || ' mentioned you in meeting minutes for "' || v_event_title || '"',
        p_event_id
      );
    END IF;
  END LOOP;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_action_item_notification(uuid, uuid, text, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_mention_notification(uuid, uuid[]) TO authenticated;