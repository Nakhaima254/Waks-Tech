-- Drop existing UPDATE and DELETE policies
DROP POLICY IF EXISTS "Users can update their own team member record" ON public.team_members;
DROP POLICY IF EXISTS "Users can delete their own team member record" ON public.team_members;

-- Create new UPDATE policy allowing admins or own record
CREATE POLICY "Users can update their own record or admins can update any"
ON public.team_members
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- Create new DELETE policy allowing admins or own record
CREATE POLICY "Users can delete their own record or admins can delete any"
ON public.team_members
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- Add INSERT policy for admins to create records for others
DROP POLICY IF EXISTS "Users can create their own team member record" ON public.team_members;

CREATE POLICY "Users can create own record or admins can create any"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);