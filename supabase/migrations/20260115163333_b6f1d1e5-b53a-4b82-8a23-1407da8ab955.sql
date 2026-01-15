-- Fix file_attachments RLS policies
DROP POLICY IF EXISTS "Anyone can view attachments" ON file_attachments;
DROP POLICY IF EXISTS "Anyone can upload attachments" ON file_attachments;
DROP POLICY IF EXISTS "Anyone can update attachments" ON file_attachments;
DROP POLICY IF EXISTS "Anyone can delete attachments" ON file_attachments;

CREATE POLICY "Authenticated users can view attachments"
ON file_attachments FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can upload attachments"
ON file_attachments FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = uploaded_by);

CREATE POLICY "Users can update their own attachments"
ON file_attachments FOR UPDATE
TO authenticated
USING (auth.uid()::text = uploaded_by);

CREATE POLICY "Users can delete their own attachments"
ON file_attachments FOR DELETE
TO authenticated
USING (auth.uid()::text = uploaded_by);

-- Fix profiles RLS policy - users should only see their own profile data
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix team_members RLS policies - require authenticated users with proper role check
DROP POLICY IF EXISTS "Authenticated users can view team members" ON team_members;
DROP POLICY IF EXISTS "Authenticated users can create team members" ON team_members;
DROP POLICY IF EXISTS "Authenticated users can update team members" ON team_members;
DROP POLICY IF EXISTS "Authenticated users can delete team members" ON team_members;

-- Team members can be viewed by all authenticated users (needed for collaboration)
CREATE POLICY "Authenticated users can view team members"
ON team_members FOR SELECT
TO authenticated
USING (true);

-- Only the creator (linked user) can modify their own team member record
CREATE POLICY "Users can create team members"
ON team_members FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own team member record"
ON team_members FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own team member record"
ON team_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Fix storage bucket - make it private
UPDATE storage.buckets SET public = false WHERE id = 'task-attachments';

-- Fix storage policies
DROP POLICY IF EXISTS "Anyone can view task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete task attachments" ON storage.objects;

CREATE POLICY "Authenticated users can view task attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can update task attachments"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can delete task attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'task-attachments');