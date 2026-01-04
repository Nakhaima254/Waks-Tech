-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true);

-- Create table for file attachments
CREATE TABLE public.file_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  uploaded_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_file_attachments_task_id ON public.file_attachments(task_id);
CREATE INDEX idx_file_attachments_file_name ON public.file_attachments(task_id, file_name);

-- Enable RLS
ALTER TABLE public.file_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we don't have auth yet)
CREATE POLICY "Anyone can view attachments"
ON public.file_attachments
FOR SELECT
USING (true);

CREATE POLICY "Anyone can upload attachments"
ON public.file_attachments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update attachments"
ON public.file_attachments
FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete attachments"
ON public.file_attachments
FOR DELETE
USING (true);

-- Storage policies for the bucket
CREATE POLICY "Anyone can view task attachments"
ON storage.objects
FOR SELECT
USING (bucket_id = 'task-attachments');

CREATE POLICY "Anyone can upload task attachments"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Anyone can update task attachments"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'task-attachments');

CREATE POLICY "Anyone can delete task attachments"
ON storage.objects
FOR DELETE
USING (bucket_id = 'task-attachments');