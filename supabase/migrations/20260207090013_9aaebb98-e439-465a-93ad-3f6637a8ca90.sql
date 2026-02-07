
-- Add client_id to studio_projects to link projects to existing clients
ALTER TABLE public.studio_projects 
ADD COLUMN client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX idx_studio_projects_client_id ON public.studio_projects(client_id);

-- Ensure delete policy exists for studio_flyers (for delete button feature)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'studio_flyers' 
    AND policyname = 'Users can delete flyers from their organization'
  ) THEN
    CREATE POLICY "Users can delete flyers from their organization"
    ON public.studio_flyers
    FOR DELETE
    USING (
      organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND is_active = true
      )
    );
  END IF;
END $$;
