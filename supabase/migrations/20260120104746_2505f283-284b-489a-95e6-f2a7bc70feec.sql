-- Create public bucket for Link23 assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('linktree-assets', 'linktree-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view linktree assets
CREATE POLICY "Anyone can view linktree assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'linktree-assets');

-- Policy: Authenticated users can upload linktree assets
CREATE POLICY "Authenticated users can upload linktree assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'linktree-assets' AND auth.role() = 'authenticated');

-- Policy: Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update linktree assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'linktree-assets' AND auth.role() = 'authenticated');

-- Policy: Authenticated users can delete their uploads
CREATE POLICY "Authenticated users can delete linktree assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'linktree-assets' AND auth.role() = 'authenticated');