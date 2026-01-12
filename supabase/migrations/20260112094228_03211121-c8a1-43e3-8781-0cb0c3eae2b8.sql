-- Make meeting-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'meeting-attachments';