-- Create the logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Public access to read logos
CREATE POLICY "Logos are publicly accessible o6a7b3"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Authenticated users can upload logos
CREATE POLICY "Users can upload logos o6a7b3"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Authenticated users can update logos
CREATE POLICY "Users can update logos o6a7b3"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

-- Authenticated users can delete logos
CREATE POLICY "Users can delete logos o6a7b3"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');
