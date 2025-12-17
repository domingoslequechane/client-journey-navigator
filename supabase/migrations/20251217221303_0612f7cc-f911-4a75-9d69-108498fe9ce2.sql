-- Add DELETE policy for authenticated users on study_suggestions
CREATE POLICY "Authenticated users can delete study suggestions"
ON public.study_suggestions
FOR DELETE
USING (auth.uid() IS NOT NULL);