-- Create plan_type enum
CREATE TYPE public.plan_type AS ENUM ('free', 'starter', 'pro', 'agency');

-- Add plan_type column to organizations table
ALTER TABLE public.organizations 
ADD COLUMN plan_type public.plan_type DEFAULT 'free';

-- Create usage_tracking table for monthly usage limits
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  feature_type TEXT NOT NULL CHECK (feature_type IN ('contracts', 'ai_messages')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, feature_type, period_start)
);

-- Enable RLS on usage_tracking
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_tracking
CREATE POLICY "Users can view their organization usage"
ON public.usage_tracking
FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update their organization usage"
ON public.usage_tracking
FOR UPDATE
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert their organization usage"
ON public.usage_tracking
FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Proprietors can manage all usage"
ON public.usage_tracking
FOR ALL
USING (has_role(auth.uid(), 'proprietor'::app_role))
WITH CHECK (has_role(auth.uid(), 'proprietor'::app_role));

-- Create plan_limits table with limits per plan
CREATE TABLE public.plan_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_type public.plan_type UNIQUE NOT NULL,
  max_clients INTEGER, -- NULL = unlimited
  max_contracts_per_month INTEGER, -- NULL = unlimited
  max_ai_messages_per_month INTEGER, -- 0 = blocked, NULL = unlimited
  max_team_members INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on plan_limits (read-only for all authenticated users)
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plan limits"
ON public.plan_limits
FOR SELECT
USING (true);

-- Insert plan limits
INSERT INTO public.plan_limits (plan_type, max_clients, max_contracts_per_month, max_ai_messages_per_month, max_team_members) VALUES
('free', 5, 2, 0, 1),
('starter', 15, 10, 50, 2),
('pro', 50, NULL, NULL, 5),
('agency', NULL, NULL, NULL, 15);

-- Create trigger for updated_at on usage_tracking
CREATE TRIGGER update_usage_tracking_updated_at
BEFORE UPDATE ON public.usage_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get or create current month usage
CREATE OR REPLACE FUNCTION public.get_or_create_usage(
  p_organization_id UUID,
  p_feature_type TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_usage_count INTEGER;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Calculate current month period
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Try to get existing usage record
  SELECT usage_count INTO v_usage_count
  FROM public.usage_tracking
  WHERE organization_id = p_organization_id
    AND feature_type = p_feature_type
    AND period_start = v_period_start;
  
  -- If not exists, create it
  IF v_usage_count IS NULL THEN
    INSERT INTO public.usage_tracking (organization_id, feature_type, period_start, period_end, usage_count)
    VALUES (p_organization_id, p_feature_type, v_period_start, v_period_end, 0)
    ON CONFLICT (organization_id, feature_type, period_start) DO NOTHING
    RETURNING usage_count INTO v_usage_count;
    
    v_usage_count := COALESCE(v_usage_count, 0);
  END IF;
  
  RETURN v_usage_count;
END;
$$;

-- Create function to increment usage
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_organization_id UUID,
  p_feature_type TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
  v_period_start DATE;
  v_period_end DATE;
BEGIN
  -- Calculate current month period
  v_period_start := date_trunc('month', CURRENT_DATE)::DATE;
  v_period_end := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
  
  -- Upsert and increment
  INSERT INTO public.usage_tracking (organization_id, feature_type, period_start, period_end, usage_count)
  VALUES (p_organization_id, p_feature_type, v_period_start, v_period_end, 1)
  ON CONFLICT (organization_id, feature_type, period_start)
  DO UPDATE SET usage_count = usage_tracking.usage_count + 1, updated_at = NOW()
  RETURNING usage_count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;