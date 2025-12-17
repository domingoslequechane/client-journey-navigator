-- Create payment_history table to track all payments
CREATE TABLE public.payment_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, confirmed, failed, refunded
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  lemonsqueezy_invoice_id TEXT,
  lemonsqueezy_order_id TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Users can view their organization's payment history
CREATE POLICY "Users can view their organization payment history"
ON public.payment_history
FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

-- Admins can manage payment history
CREATE POLICY "Admins can manage payment history"
ON public.payment_history
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));