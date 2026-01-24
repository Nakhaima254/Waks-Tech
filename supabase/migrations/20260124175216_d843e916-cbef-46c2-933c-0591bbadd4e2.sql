-- Function to promote the first user to admin
CREATE OR REPLACE FUNCTION public.maybe_promote_first_user_to_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is the first user_roles record ever
  IF (SELECT COUNT(*) FROM public.user_roles) = 1 THEN
    -- Update the newly inserted record to admin
    UPDATE public.user_roles 
    SET role = 'admin' 
    WHERE id = NEW.id;
    
    -- Update NEW to reflect the change for the return
    NEW.role := 'admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to run after insert on user_roles
CREATE TRIGGER promote_first_user_to_admin
AFTER INSERT ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.maybe_promote_first_user_to_admin();