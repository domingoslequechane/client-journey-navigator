-- Create table for payment methods (multiple per organization)
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  recipient_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their organization payment methods" 
ON public.payment_methods 
FOR SELECT 
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can insert payment methods" 
ON public.payment_methods 
FOR INSERT 
WITH CHECK (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can update payment methods" 
ON public.payment_methods 
FOR UPDATE 
USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete payment methods" 
ON public.payment_methods 
FOR DELETE 
USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_payment_methods_updated_at
BEFORE UPDATE ON public.payment_methods
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_payment_methods_organization_id ON public.payment_methods(organization_id);