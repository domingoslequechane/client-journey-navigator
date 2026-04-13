CREATE TYPE insight_status AS ENUM ('draft', 'published');

CREATE TABLE public.insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    excerpt TEXT,
    content TEXT,
    cover_image TEXT,
    source_url TEXT,
    status insight_status DEFAULT 'draft',
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords TEXT[],
    author_id UUID REFERENCES public.profiles(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Insights are viewable by everyone if published"
    ON public.insights
    FOR SELECT
    USING (status = 'published');

CREATE POLICY "Insights can be viewed by admins"
    ON public.insights
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
    );

CREATE POLICY "Insights can be inserted by admins"
    ON public.insights
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
    );

CREATE POLICY "Insights can be updated by admins"
    ON public.insights
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
    );

CREATE POLICY "Insights can be deleted by admins"
    ON public.insights
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.is_admin = true
      )
    );
