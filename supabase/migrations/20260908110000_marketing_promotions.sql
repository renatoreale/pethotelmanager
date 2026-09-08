-- Pulsante "Crea promozione con AI": genera testo per social + Google Ads
-- e uno storyboard per uno slideshow TikTok, usando foto già presenti della
-- pensione (pet, diario, logo) + testo scritto da un'AI con persona
-- "direttore marketing senior + copywriter senior". Funzione abilitabile
-- solo dal super admin, tenant per tenant — stesso pattern già in uso per
-- client_reminders_enabled (colonna su tenants, switch in Admin.tsx).
ALTER TABLE public.tenants
  ADD COLUMN marketing_promo_enabled boolean NOT NULL DEFAULT false;

-- Storico delle promozioni generate. Stesso pattern RLS già in uso per
-- diario_entries: lettura/scrittura consentite a chi appartiene al tenant
-- (o è admin) tramite get_user_tenant_id/has_role.
CREATE TABLE public.marketing_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  context_note TEXT,
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  social_caption TEXT,
  social_hashtags TEXT,
  google_ad_headline TEXT,
  google_ad_description TEXT,
  video_slides JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX idx_marketing_promotions_tenant_id ON public.marketing_promotions(tenant_id, created_at DESC);

ALTER TABLE public.marketing_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users see marketing promotions" ON public.marketing_promotions
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenant staff manage marketing promotions" ON public.marketing_promotions
  FOR ALL TO authenticated
  USING (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));
