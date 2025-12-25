-- Create invoice template settings table for storing organization-specific invoice styling preferences
CREATE TABLE public.invoice_template_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_style TEXT NOT NULL DEFAULT 'modern',
  show_logo BOOLEAN DEFAULT true,
  show_watermark BOOLEAN DEFAULT false,
  primary_color TEXT DEFAULT '#2962FF',
  footer_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id)
);

-- Enable RLS
ALTER TABLE public.invoice_template_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their organization invoice settings"
  ON public.invoice_template_settings
  FOR SELECT
  USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can insert organization invoice settings"
  ON public.invoice_template_settings
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can update organization invoice settings"
  ON public.invoice_template_settings
  FOR UPDATE
  USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete organization invoice settings"
  ON public.invoice_template_settings
  FOR DELETE
  USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- Add updated_at trigger
CREATE TRIGGER update_invoice_template_settings_updated_at
  BEFORE UPDATE ON public.invoice_template_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();