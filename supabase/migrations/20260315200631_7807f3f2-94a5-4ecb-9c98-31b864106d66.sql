
CREATE TABLE public.system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage system_config"
  ON public.system_config FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users read system_config"
  ON public.system_config FOR SELECT
  TO authenticated
  USING (true);

-- Insert default config
INSERT INTO public.system_config (key, value) VALUES
  ('db_mode', '{"mode": "cloud", "external_url": "", "external_anon_key": ""}'::jsonb);
