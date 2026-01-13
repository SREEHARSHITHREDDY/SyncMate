-- Remove the overly permissive SELECT policy on storage.objects for meeting-attachments
-- Access to attachments should only be granted via signed URLs from the get-signed-url Edge Function

DROP POLICY IF EXISTS "Users can view meeting attachments" ON storage.objects;