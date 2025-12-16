-- Create study_suggestions table for Academia feature
CREATE TABLE public.study_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty_level TEXT DEFAULT 'intermediate',
  source TEXT, -- where the difficulty was identified (e.g., client stage, AI analysis)
  ai_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_suggestions ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view suggestions
CREATE POLICY "Authenticated users can view study suggestions"
ON public.study_suggestions FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage suggestions
CREATE POLICY "Admins can manage study suggestions"
ON public.study_suggestions FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_study_suggestions_updated_at
BEFORE UPDATE ON public.study_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();