-- Link pages table (one per client)
CREATE TABLE public.link_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  bio TEXT,
  theme JSONB DEFAULT '{"backgroundColor": "#1a1a2e", "primaryColor": "#a3e635", "textColor": "#ffffff", "fontFamily": "Inter", "buttonStyle": "outline", "buttonRadius": "pill"}'::jsonb,
  is_published BOOLEAN DEFAULT false,
  custom_domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(slug),
  UNIQUE(client_id)
);

-- Link blocks table
CREATE TABLE public.link_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_page_id UUID NOT NULL REFERENCES public.link_pages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('button', 'text', 'image', 'video', 'social', 'divider', 'email-form')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  style JSONB,
  is_enabled BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Link analytics table
CREATE TABLE public.link_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  link_page_id UUID NOT NULL REFERENCES public.link_pages(id) ON DELETE CASCADE,
  link_block_id UUID REFERENCES public.link_blocks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.link_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for link_pages
CREATE POLICY "Users can view organization link pages"
ON public.link_pages FOR SELECT
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can create organization link pages"
ON public.link_pages FOR INSERT
WITH CHECK (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can update organization link pages"
ON public.link_pages FOR UPDATE
USING (user_belongs_to_org(auth.uid(), organization_id));

CREATE POLICY "Users can delete organization link pages"
ON public.link_pages FOR DELETE
USING (user_belongs_to_org(auth.uid(), organization_id));

-- Public access for published pages (anonymous users)
CREATE POLICY "Anyone can view published link pages by slug"
ON public.link_pages FOR SELECT
USING (is_published = true);

-- RLS Policies for link_blocks - organization members
CREATE POLICY "Users can view blocks via link page org"
ON public.link_blocks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.link_pages lp
  WHERE lp.id = link_blocks.link_page_id
  AND user_belongs_to_org(auth.uid(), lp.organization_id)
));

CREATE POLICY "Users can create blocks via link page org"
ON public.link_blocks FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.link_pages lp
  WHERE lp.id = link_blocks.link_page_id
  AND user_belongs_to_org(auth.uid(), lp.organization_id)
));

CREATE POLICY "Users can update blocks via link page org"
ON public.link_blocks FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.link_pages lp
  WHERE lp.id = link_blocks.link_page_id
  AND user_belongs_to_org(auth.uid(), lp.organization_id)
));

CREATE POLICY "Users can delete blocks via link page org"
ON public.link_blocks FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.link_pages lp
  WHERE lp.id = link_blocks.link_page_id
  AND user_belongs_to_org(auth.uid(), lp.organization_id)
));

-- Public access for blocks of published pages
CREATE POLICY "Anyone can view blocks of published pages"
ON public.link_blocks FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.link_pages lp
  WHERE lp.id = link_blocks.link_page_id
  AND lp.is_published = true
));

-- RLS Policies for link_analytics
CREATE POLICY "Users can view analytics for their org pages"
ON public.link_analytics FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.link_pages lp
  WHERE lp.id = link_analytics.link_page_id
  AND user_belongs_to_org(auth.uid(), lp.organization_id)
));

-- Anyone can insert analytics (for public page tracking)
CREATE POLICY "Anyone can insert analytics"
ON public.link_analytics FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.link_pages lp
  WHERE lp.id = link_analytics.link_page_id
  AND lp.is_published = true
));

-- Indexes for performance
CREATE INDEX idx_link_pages_slug ON public.link_pages(slug);
CREATE INDEX idx_link_pages_client ON public.link_pages(client_id);
CREATE INDEX idx_link_pages_org ON public.link_pages(organization_id);
CREATE INDEX idx_link_blocks_page ON public.link_blocks(link_page_id);
CREATE INDEX idx_link_blocks_sort ON public.link_blocks(link_page_id, sort_order);
CREATE INDEX idx_link_analytics_page ON public.link_analytics(link_page_id);
CREATE INDEX idx_link_analytics_created ON public.link_analytics(created_at);

-- Updated at trigger for link_pages
CREATE TRIGGER update_link_pages_updated_at
BEFORE UPDATE ON public.link_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Updated at trigger for link_blocks
CREATE TRIGGER update_link_blocks_updated_at
BEFORE UPDATE ON public.link_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();