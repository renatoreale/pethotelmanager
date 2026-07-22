-- Aggiunge i campi necessari per collegare un tenant al suo cliente/abbonamento
-- Stripe e per tracciare lo stato dell'abbonamento tramite webhook.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_status text;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id ON public.tenants (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription_id ON public.tenants (stripe_subscription_id);
