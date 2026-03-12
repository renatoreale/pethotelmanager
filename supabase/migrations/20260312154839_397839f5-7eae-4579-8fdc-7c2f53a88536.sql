-- Add photo_url column to cats table
ALTER TABLE public.cats ADD COLUMN photo_url text;

-- Create storage bucket for cat photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('cat-photos', 'cat-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for cat photos
CREATE POLICY "Public read cat photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'cat-photos');

-- Authenticated users can upload cat photos
CREATE POLICY "Authenticated upload cat photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'cat-photos');

-- Authenticated users can update cat photos
CREATE POLICY "Authenticated update cat photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'cat-photos');

-- Authenticated users can delete cat photos
CREATE POLICY "Authenticated delete cat photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'cat-photos');