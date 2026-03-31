-- Create finances_categories table
CREATE TABLE IF NOT EXISTS public.finances_categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('RECEITA', 'DESPESA')),
  name text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create finances_transactions table
CREATE TABLE IF NOT EXISTS public.finances_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('RECEITA', 'DESPESA', 'SALDO INICIAL')),
  category_id uuid REFERENCES public.finances_categories(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.finances_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finances_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for finances_categories
CREATE POLICY "Users can view finances_categories in their org"
  ON public.finances_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = finances_categories.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert finances_categories in their org"
  ON public.finances_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = finances_categories.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update finances_categories in their org"
  ON public.finances_categories FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = finances_categories.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete finances_categories in their org"
  ON public.finances_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = finances_categories.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Policies for finances_transactions
CREATE POLICY "Users can view finances_transactions in their org"
  ON public.finances_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = finances_transactions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert finances_transactions in their org"
  ON public.finances_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = finances_transactions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update finances_transactions in their org"
  ON public.finances_transactions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = finances_transactions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete finances_transactions in their org"
  ON public.finances_transactions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = finances_transactions.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );
