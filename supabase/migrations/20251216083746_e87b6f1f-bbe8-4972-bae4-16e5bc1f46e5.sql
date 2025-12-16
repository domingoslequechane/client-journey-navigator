-- Create agency_settings table
CREATE TABLE public.agency_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_name text NOT NULL DEFAULT '',
  headquarters text,
  nuit text,
  representative_name text,
  representative_position text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.agency_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can view settings
CREATE POLICY "Authenticated users can view agency settings"
ON public.agency_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Only admins can manage settings
CREATE POLICY "Admins can manage agency settings"
ON public.agency_settings
FOR ALL
USING (public.is_admin(auth.uid()));

-- Add paused columns to clients table
ALTER TABLE public.clients
ADD COLUMN paused boolean NOT NULL DEFAULT false,
ADD COLUMN paused_at timestamp with time zone,
ADD COLUMN paused_by uuid REFERENCES auth.users(id);

-- Insert default agency settings row
INSERT INTO public.agency_settings (agency_name) VALUES ('');

-- Create trigger for updated_at
CREATE TRIGGER update_agency_settings_updated_at
BEFORE UPDATE ON public.agency_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();