
CREATE TABLE public.trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  device_name text NOT NULL DEFAULT 'Unknown Device',
  user_agent text NOT NULL,
  is_trusted boolean NOT NULL DEFAULT true,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own devices"
  ON public.trusted_devices FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own devices"
  ON public.trusted_devices FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own devices"
  ON public.trusted_devices FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own devices"
  ON public.trusted_devices FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE UNIQUE INDEX idx_trusted_devices_user_agent ON public.trusted_devices (user_id, user_agent);
