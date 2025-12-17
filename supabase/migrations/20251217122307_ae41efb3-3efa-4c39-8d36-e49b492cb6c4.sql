-- Create feedback table for user feedback
CREATE TABLE public.feedbacks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  organization_id UUID REFERENCES public.organizations(id),
  type TEXT NOT NULL DEFAULT 'general', -- 'bug', 'feature', 'general', 'support'
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Users can create their own feedback
CREATE POLICY "Users can create feedback"
ON public.feedbacks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback"
ON public.feedbacks
FOR SELECT
USING (auth.uid() = user_id);

-- Super admins (app_role = 'admin') can view all feedbacks
CREATE POLICY "Super admins can view all feedbacks"
ON public.feedbacks
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Super admins can update feedbacks
CREATE POLICY "Super admins can update feedbacks"
ON public.feedbacks
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Super admins can delete feedbacks
CREATE POLICY "Super admins can delete feedbacks"
ON public.feedbacks
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_feedbacks_updated_at
BEFORE UPDATE ON public.feedbacks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();