
-- Add new tenant fields
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS partita_iva text,
  ADD COLUMN IF NOT EXISTS pec text,
  ADD COLUMN IF NOT EXISTS titolare_name text,
  ADD COLUMN IF NOT EXISTS logo_url text;

-- Create storage bucket for tenant logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-logos', 'tenant-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users upload tenant logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tenant-logos');

-- Allow public read access to logos
CREATE POLICY "Public read tenant logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'tenant-logos');

-- Allow authenticated users to update/delete their logos
CREATE POLICY "Authenticated users manage tenant logos"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'tenant-logos')
WITH CHECK (bucket_id = 'tenant-logos');
