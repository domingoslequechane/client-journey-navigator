-- Add INSERT policy for authenticated users on study_suggestions
CREATE POLICY "Authenticated users can insert study suggestions"
ON public.study_suggestions
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);