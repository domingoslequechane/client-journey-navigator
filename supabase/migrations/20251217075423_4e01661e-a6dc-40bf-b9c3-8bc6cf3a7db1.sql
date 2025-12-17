-- Create subscription status enum
CREATE TYPE public.subscription_status AS ENUM (
  'trialing',
  'active', 
  'past_due',
  'cancelled',
  'expired'
);

-- Create organizations table
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_ends_at timestamp with time zone NOT NULL DEFAULT (now() + interval '14 days'),
  knowledge_base_text text,
  knowledge_base_name text,
  knowledge_base_url text,
  representative_name text,
  representative_position text,
  nuit text,
  headquarters text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lemonsqueezy_subscription_id text,
  lemonsqueezy_customer_id text,
  lemonsqueezy_order_id text,
  lemonsqueezy_product_id text,
  lemonsqueezy_variant_id text,
  status subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

-- Add organization_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Add organization_id to clients
ALTER TABLE public.clients 
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to activities  
ALTER TABLE public.activities
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to checklist_items
ALTER TABLE public.checklist_items
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Add organization_id to ai_conversations
ALTER TABLE public.ai_conversations
ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = user_uuid LIMIT 1
$$;

-- Create function to check if user belongs to organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(user_uuid uuid, org_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_uuid AND organization_id = org_uuid
  )
$$;

-- Create function to check subscription status
CREATE OR REPLACE FUNCTION public.has_active_subscription(org_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.organizations o ON s.organization_id = o.id
    WHERE s.organization_id = org_uuid 
    AND (
      s.status = 'active' 
      OR (s.status = 'trialing' AND o.trial_ends_at > now())
      OR (s.status = 'past_due')
    )
  )
$$;

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization"
ON public.organizations FOR SELECT
USING (user_belongs_to_org(auth.uid(), id));

CREATE POLICY "Organization owner can update"
ON public.organizations FOR UPDATE
USING (owner_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their organization subscription"
ON public.subscriptions FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "System can manage subscriptions"
ON public.subscriptions FOR ALL
USING (true)
WITH CHECK (true);

-- Update trigger for organizations
CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing RLS policies to include organization check
-- Clients: Add organization-based policies
CREATE POLICY "Users can view clients in their organization"
ON public.clients FOR SELECT
USING (
  organization_id IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can insert clients in their organization"
ON public.clients FOR INSERT
WITH CHECK (
  organization_id IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can update clients in their organization"
ON public.clients FOR UPDATE
USING (
  organization_id IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can delete clients in their organization"
ON public.clients FOR DELETE
USING (
  organization_id IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Create function to generate slug from name
CREATE OR REPLACE FUNCTION public.generate_slug(name text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  -- Convert to lowercase and replace spaces/special chars with hyphens
  base_slug := lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;