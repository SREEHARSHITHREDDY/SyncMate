-- Create storage bucket for meeting minutes attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-attachments', 'meeting-attachments', true);

-- Create table to track attachments
CREATE TABLE public.meeting_minute_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  minute_id UUID NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meeting_minute_attachments ENABLE ROW LEVEL SECURITY;

-- Policy: Users who can view the meeting minute can view its attachments
CREATE POLICY "Users can view attachments for accessible minutes"
ON public.meeting_minute_attachments
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.meeting_minutes mm
    JOIN public.events e ON e.id = mm.event_id
    LEFT JOIN public.event_responses er ON er.event_id = e.id AND er.user_id = auth.uid()
    WHERE mm.id = minute_id
    AND (e.creator_id = auth.uid() OR er.response = 'accepted')
  )
);

-- Policy: Users who can edit meeting minutes can upload attachments
CREATE POLICY "Users can upload attachments to their minutes"
ON public.meeting_minute_attachments
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = uploaded_by AND
  EXISTS (
    SELECT 1 FROM public.meeting_minutes mm
    JOIN public.events e ON e.id = mm.event_id
    LEFT JOIN public.event_responses er ON er.event_id = e.id AND er.user_id = auth.uid()
    WHERE mm.id = minute_id
    AND (e.creator_id = auth.uid() OR er.response = 'accepted')
  )
);

-- Policy: Users can delete their own attachments
CREATE POLICY "Users can delete their own attachments"
ON public.meeting_minute_attachments
FOR DELETE
USING (
  auth.uid() IS NOT NULL AND
  auth.uid() = uploaded_by
);

-- Storage policies for the bucket
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'meeting-attachments' AND
  auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view meeting attachments"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'meeting-attachments'
);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'meeting-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);