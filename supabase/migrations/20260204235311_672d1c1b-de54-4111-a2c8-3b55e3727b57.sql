-- Create enum types for financial module
CREATE TYPE financial_transaction_type AS ENUM ('income', 'expense');
CREATE TYPE financial_payment_method AS ENUM ('transfer', 'mpesa', 'emola', 'cash', 'other');
CREATE TYPE financial_project_status AS ENUM ('planning', 'in_progress', 'completed', 'cancelled');
CREATE TYPE financial_goal_type AS ENUM ('monthly', 'quarterly', 'yearly');

-- Create financial_categories table (must be created first due to FK)
CREATE TABLE public.financial_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type financial_transaction_type NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create financial_transactions table
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type financial_transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  payment_method financial_payment_method NOT NULL DEFAULT 'transfer',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create financial_projects table
CREATE TABLE public.financial_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  budget DECIMAL(12,2) NOT NULL DEFAULT 0,
  status financial_project_status NOT NULL DEFAULT 'planning',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create financial_goals table
CREATE TABLE public.financial_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL(12,2) NOT NULL,
  current_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  goal_type financial_goal_type NOT NULL DEFAULT 'monthly',
  year INTEGER NOT NULL,
  month INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_financial_transactions_org ON public.financial_transactions(organization_id);
CREATE INDEX idx_financial_transactions_date ON public.financial_transactions(date);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX idx_financial_transactions_client ON public.financial_transactions(client_id);
CREATE INDEX idx_financial_categories_org ON public.financial_categories(organization_id);
CREATE INDEX idx_financial_projects_org ON public.financial_projects(organization_id);
CREATE INDEX idx_financial_projects_status ON public.financial_projects(status);
CREATE INDEX idx_financial_goals_org ON public.financial_goals(organization_id);
CREATE INDEX idx_financial_goals_year ON public.financial_goals(year);

-- Enable RLS on all tables
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for financial_categories
CREATE POLICY "Users can view their org categories"
ON public.financial_categories FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can insert categories"
ON public.financial_categories FOR INSERT
WITH CHECK (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can update categories"
ON public.financial_categories FOR UPDATE
USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete categories"
ON public.financial_categories FOR DELETE
USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- RLS Policies for financial_transactions
CREATE POLICY "Users can view their org transactions"
ON public.financial_transactions FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert transactions"
ON public.financial_transactions FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update their org transactions"
ON public.financial_transactions FOR UPDATE
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete transactions"
ON public.financial_transactions FOR DELETE
USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- RLS Policies for financial_projects
CREATE POLICY "Users can view their org projects"
ON public.financial_projects FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert projects"
ON public.financial_projects FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update their org projects"
ON public.financial_projects FOR UPDATE
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete projects"
ON public.financial_projects FOR DELETE
USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- RLS Policies for financial_goals
CREATE POLICY "Users can view their org goals"
ON public.financial_goals FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can insert goals"
ON public.financial_goals FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update their org goals"
ON public.financial_goals FOR UPDATE
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete goals"
ON public.financial_goals FOR DELETE
USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- Create trigger function for updated_at
CREATE OR REPLACE FUNCTION public.update_financial_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_financial_transactions_updated_at
BEFORE UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_financial_updated_at();

CREATE TRIGGER update_financial_projects_updated_at
BEFORE UPDATE ON public.financial_projects
FOR EACH ROW EXECUTE FUNCTION public.update_financial_updated_at();

CREATE TRIGGER update_financial_goals_updated_at
BEFORE UPDATE ON public.financial_goals
FOR EACH ROW EXECUTE FUNCTION public.update_financial_updated_at();