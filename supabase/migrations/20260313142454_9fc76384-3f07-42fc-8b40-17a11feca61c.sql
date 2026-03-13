CREATE TABLE public.demo_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public form)
CREATE POLICY "Anyone can insert demo_leads" ON public.demo_leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read
CREATE POLICY "Admins read demo_leads" ON public.demo_leads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));