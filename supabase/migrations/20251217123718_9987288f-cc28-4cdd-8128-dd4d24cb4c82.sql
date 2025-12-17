-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general' CHECK (type IN ('general', 'admin_only', 'user_specific')),
  target_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_id UUID REFERENCES public.feedbacks(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notification reads table
CREATE TABLE public.notification_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at TIMESTAMP WITH TIME ZONE,
  closed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create support messages table
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Super admins can manage notifications"
ON public.notifications FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view general notifications"
ON public.notifications FOR SELECT
USING (type = 'general');

CREATE POLICY "Admins can view admin notifications"
ON public.notifications FOR SELECT
USING (type = 'admin_only' AND is_admin(auth.uid()));

CREATE POLICY "Users can view their specific notifications"
ON public.notifications FOR SELECT
USING (type = 'user_specific' AND target_user_id = auth.uid());

-- Notification reads policies
CREATE POLICY "Users can manage own notification reads"
ON public.notification_reads FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all notification reads"
ON public.notification_reads FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Support tickets policies
CREATE POLICY "Users can view own tickets"
ON public.support_tickets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tickets"
ON public.support_tickets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tickets"
ON public.support_tickets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all tickets"
ON public.support_tickets FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Support messages policies
CREATE POLICY "Users can view messages from own tickets"
ON public.support_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.support_tickets
  WHERE id = support_messages.ticket_id
  AND (user_id = auth.uid() OR has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Users can send messages to own tickets"
ON public.support_messages FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.support_tickets
  WHERE id = support_messages.ticket_id
  AND user_id = auth.uid()
  AND status = 'open'
));

CREATE POLICY "Super admins can send messages to any ticket"
ON public.support_messages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to delete old closed tickets (30+ days)
CREATE OR REPLACE FUNCTION public.cleanup_old_support_tickets()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.support_tickets
  WHERE status = 'closed'
  AND closed_at < now() - interval '30 days';
END;
$$;