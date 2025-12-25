-- Create service_invoices table
CREATE TABLE public.service_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  services JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  tax_percentage NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  pdf_url TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_invoices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for service_invoices
CREATE POLICY "Users can view organization invoices"
ON public.service_invoices
FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can create organization invoices"
ON public.service_invoices
FOR INSERT
WITH CHECK (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can update organization invoices"
ON public.service_invoices
FOR UPDATE
USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete organization invoices"
ON public.service_invoices
FOR DELETE
USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- Add payment fields to organizations
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS payment_provider_name TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS payment_account_number TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS payment_recipient_name TEXT;

-- Create index for faster lookups
CREATE INDEX idx_service_invoices_client ON public.service_invoices(client_id);
CREATE INDEX idx_service_invoices_org ON public.service_invoices(organization_id);