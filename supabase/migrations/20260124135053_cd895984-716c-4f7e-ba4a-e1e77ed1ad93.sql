-- Drop the existing overly permissive INSERT policy
DROP POLICY IF EXISTS "Users can create team members" ON public.team_members;

-- Create a new restrictive INSERT policy requiring user_id = auth.uid()
CREATE POLICY "Users can create their own team member record"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create a function to auto-create team member record on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_team_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.team_members (user_id, name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'developer'
  );
  RETURN new;
END;
$$;

-- Create trigger to call the function after user creation
CREATE TRIGGER on_auth_user_created_team_member
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_team_member();