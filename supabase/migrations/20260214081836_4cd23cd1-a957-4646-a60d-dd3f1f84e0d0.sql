
-- Editorial Plans: stores AI-generated editorial calendars per client/month
CREATE TABLE public.editorial_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  content JSONB,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, client_id, month, year)
);

-- Editorial Tasks: individual content tasks in the editorial calendar
CREATE TABLE public.editorial_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.editorial_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT,
  platform TEXT,
  content_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.editorial_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editorial_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for editorial_plans
CREATE POLICY "Users can view editorial plans of their organization"
ON public.editorial_plans FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can create editorial plans for their organization"
ON public.editorial_plans FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update editorial plans of their organization"
ON public.editorial_plans FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete editorial plans of their organization"
ON public.editorial_plans FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- RLS Policies for editorial_tasks
CREATE POLICY "Users can view editorial tasks of their organization"
ON public.editorial_tasks FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can create editorial tasks for their organization"
ON public.editorial_tasks FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update editorial tasks of their organization"
ON public.editorial_tasks FOR UPDATE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can delete editorial tasks of their organization"
ON public.editorial_tasks FOR DELETE
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Indexes for performance
CREATE INDEX idx_editorial_plans_org_client ON public.editorial_plans(organization_id, client_id);
CREATE INDEX idx_editorial_tasks_org_date ON public.editorial_tasks(organization_id, scheduled_date);
CREATE INDEX idx_editorial_tasks_plan ON public.editorial_tasks(plan_id);
CREATE INDEX idx_editorial_tasks_status ON public.editorial_tasks(organization_id, status);

-- Trigger for updated_at
CREATE TRIGGER update_editorial_plans_updated_at
BEFORE UPDATE ON public.editorial_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_editorial_tasks_updated_at
BEFORE UPDATE ON public.editorial_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
