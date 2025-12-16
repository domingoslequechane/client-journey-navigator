-- Add contract columns to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_url text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_name text;

-- Add knowledge base columns to agency_settings
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS knowledge_base_url text;
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS knowledge_base_name text;
ALTER TABLE public.agency_settings ADD COLUMN IF NOT EXISTS knowledge_base_text text;

-- Create contracts storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false) ON CONFLICT (id) DO NOTHING;

-- Create knowledge-base storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-base', 'knowledge-base', false) ON CONFLICT (id) DO NOTHING;

-- Storage policies for contracts bucket
CREATE POLICY "Authenticated users can upload contracts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can view contracts"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can update contracts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'contracts');

CREATE POLICY "Authenticated users can delete contracts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'contracts');

-- Storage policies for knowledge-base bucket (admin only)
CREATE POLICY "Admins can upload knowledge base"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'knowledge-base' AND is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view knowledge base"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'knowledge-base');

CREATE POLICY "Admins can update knowledge base"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'knowledge-base' AND is_admin(auth.uid()));

CREATE POLICY "Admins can delete knowledge base"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'knowledge-base' AND is_admin(auth.uid()));