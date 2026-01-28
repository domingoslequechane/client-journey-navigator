-- =============================================
-- STUDIO AI MODULE - Database Schema
-- =============================================

-- Projetos de design (equivalente a "clients" do Studio Creator)
CREATE TABLE public.studio_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    niche TEXT,
    primary_color TEXT DEFAULT '#3b82f6',
    secondary_color TEXT DEFAULT '#10b981',
    font_family TEXT DEFAULT 'Inter',
    ai_instructions TEXT,
    ai_restrictions TEXT,
    logo_images TEXT[] DEFAULT '{}',
    reference_images TEXT[] DEFAULT '{}',
    template_image TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Flyers gerados
CREATE TABLE public.studio_flyers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    size TEXT DEFAULT '1080x1080',
    style TEXT DEFAULT 'vivid',
    niche TEXT,
    model TEXT DEFAULT 'gemini-flash',
    generation_mode TEXT DEFAULT 'original',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Avaliações de flyers
CREATE TABLE public.studio_flyer_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flyer_id UUID NOT NULL REFERENCES public.studio_flyers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(flyer_id, user_id)
);

-- Histórico de aprendizagem AI
CREATE TABLE public.studio_ai_learnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    learning_type TEXT NOT NULL CHECK (learning_type IN ('preference', 'correction', 'style', 'feedback')),
    content TEXT NOT NULL,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- =============================================
-- RLS Policies
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_flyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_flyer_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studio_ai_learnings ENABLE ROW LEVEL SECURITY;

-- studio_projects policies
CREATE POLICY "Users can view organization projects"
    ON public.studio_projects FOR SELECT
    USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create organization projects"
    ON public.studio_projects FOR INSERT
    WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update organization projects"
    ON public.studio_projects FOR UPDATE
    USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete organization projects"
    ON public.studio_projects FOR DELETE
    USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- studio_flyers policies
CREATE POLICY "Users can view organization flyers"
    ON public.studio_flyers FOR SELECT
    USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create organization flyers"
    ON public.studio_flyers FOR INSERT
    WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update organization flyers"
    ON public.studio_flyers FOR UPDATE
    USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Admins can delete organization flyers"
    ON public.studio_flyers FOR DELETE
    USING (is_admin(auth.uid()) AND user_belongs_to_org(auth.uid(), organization_id));

-- studio_flyer_ratings policies
CREATE POLICY "Users can view organization ratings"
    ON public.studio_flyer_ratings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.studio_flyers sf
        WHERE sf.id = studio_flyer_ratings.flyer_id
        AND user_belongs_to_org(auth.uid(), sf.organization_id)
    ));

CREATE POLICY "Users can create ratings"
    ON public.studio_flyer_ratings FOR INSERT
    WITH CHECK (auth.uid() = user_id AND EXISTS (
        SELECT 1 FROM public.studio_flyers sf
        WHERE sf.id = studio_flyer_ratings.flyer_id
        AND user_belongs_to_org(auth.uid(), sf.organization_id)
    ));

CREATE POLICY "Users can update own ratings"
    ON public.studio_flyer_ratings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
    ON public.studio_flyer_ratings FOR DELETE
    USING (auth.uid() = user_id);

-- studio_ai_learnings policies
CREATE POLICY "Users can view organization learnings"
    ON public.studio_ai_learnings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.studio_projects sp
        WHERE sp.id = studio_ai_learnings.project_id
        AND user_belongs_to_org(auth.uid(), sp.organization_id)
    ));

CREATE POLICY "Users can create learnings"
    ON public.studio_ai_learnings FOR INSERT
    WITH CHECK (auth.uid() = user_id AND EXISTS (
        SELECT 1 FROM public.studio_projects sp
        WHERE sp.id = studio_ai_learnings.project_id
        AND user_belongs_to_org(auth.uid(), sp.organization_id)
    ));

CREATE POLICY "Users can delete own learnings"
    ON public.studio_ai_learnings FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- Triggers for updated_at
-- =============================================

CREATE TRIGGER update_studio_projects_updated_at
    BEFORE UPDATE ON public.studio_projects
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Storage Bucket
-- =============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('studio-assets', 'studio-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload studio assets"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'studio-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view studio assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'studio-assets');

CREATE POLICY "Users can update own studio assets"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'studio-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete studio assets"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'studio-assets' AND auth.uid() IS NOT NULL);

-- =============================================
-- Plan Limits Update
-- =============================================

ALTER TABLE public.plan_limits ADD COLUMN IF NOT EXISTS max_studio_generations INTEGER DEFAULT NULL;

UPDATE public.plan_limits SET max_studio_generations = 10 WHERE plan_type = 'free';
UPDATE public.plan_limits SET max_studio_generations = 50 WHERE plan_type = 'starter';
UPDATE public.plan_limits SET max_studio_generations = 200 WHERE plan_type = 'pro';
UPDATE public.plan_limits SET max_studio_generations = NULL WHERE plan_type = 'agency';