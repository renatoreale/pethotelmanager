-- Landing page configuration (singleton, managed by admin)
CREATE TABLE public.landing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_days integer NOT NULL DEFAULT 14,
  base_plan_price_yearly numeric NOT NULL DEFAULT 290,
  pro_plan_price_yearly numeric NOT NULL DEFAULT 490,
  base_plan_features jsonb NOT NULL DEFAULT '["Gestione prenotazioni", "Calendario appuntamenti", "Anagrafica clienti e animali", "Registro presenze", "1 pensione"]'::jsonb,
  pro_plan_features jsonb NOT NULL DEFAULT '["Tutto del piano Base", "Gestione pagamenti completa", "Preventivi e documenti PDF", "Occupazione casette", "Planning e task", "Multi-pensione (fino a 3)", "Report e statistiche"]'::jsonb,
  hero_title text NOT NULL DEFAULT 'CatHotel Manager',
  hero_subtitle text NOT NULL DEFAULT 'Il gestionale completo per la tua pensione per animali',
  hero_description text NOT NULL DEFAULT 'Gestisci prenotazioni, pagamenti, clienti e animali in un unico posto. Provalo gratis!',
  cta_text text NOT NULL DEFAULT 'Inizia la prova gratuita',
  show_trial_banner boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone reads landing_config" ON public.landing_config
  FOR SELECT USING (true);

CREATE POLICY "Admins manage landing_config" ON public.landing_config
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.landing_config DEFAULT VALUES;

-- Trial registrations tracking
CREATE TABLE public.trial_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  pet_type public.pet_type NOT NULL DEFAULT 'gatti',
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  trial_start timestamptz NOT NULL DEFAULT now(),
  trial_end timestamptz NOT NULL,
  is_converted boolean NOT NULL DEFAULT false,
  converted_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  last_login_at timestamptz,
  login_count integer NOT NULL DEFAULT 0,
  pages_visited jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.trial_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own trial" ON public.trial_registrations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own trial" ON public.trial_registrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own trial" ON public.trial_registrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete trials" ON public.trial_registrations
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trial activity log
CREATE TABLE public.trial_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES public.trial_registrations(id) ON DELETE CASCADE,
  action text NOT NULL,
  page text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trial_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see trial_activity_log" ON public.trial_activity_log
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own activity" ON public.trial_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trial_registrations tr
    WHERE tr.id = trial_activity_log.trial_id AND tr.user_id = auth.uid()
  ));

CREATE INDEX idx_trial_registrations_user_id ON public.trial_registrations(user_id);
CREATE INDEX idx_trial_registrations_converted ON public.trial_registrations(is_converted);
CREATE INDEX idx_trial_activity_log_trial_id ON public.trial_activity_log(trial_id);
CREATE INDEX idx_trial_activity_log_created_at ON public.trial_activity_log(created_at);