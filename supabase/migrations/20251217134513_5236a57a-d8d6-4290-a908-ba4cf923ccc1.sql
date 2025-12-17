-- Step 2: Update existing admin records to proprietor and update RLS policies

-- Update existing user_roles records
UPDATE public.user_roles SET role = 'proprietor' WHERE role = 'admin';

-- Update handle_new_user_role function to use 'user' as default (already correct)
-- No changes needed there

-- Update RLS policies that reference 'admin'::app_role to 'proprietor'::app_role

-- feedbacks table policies
DROP POLICY IF EXISTS "Super admins can delete feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Super admins can update feedbacks" ON public.feedbacks;
DROP POLICY IF EXISTS "Super admins can view all feedbacks" ON public.feedbacks;

CREATE POLICY "Proprietors can delete feedbacks" 
ON public.feedbacks 
FOR DELETE 
USING (has_role(auth.uid(), 'proprietor'::app_role));

CREATE POLICY "Proprietors can update feedbacks" 
ON public.feedbacks 
FOR UPDATE 
USING (has_role(auth.uid(), 'proprietor'::app_role));

CREATE POLICY "Proprietors can view all feedbacks" 
ON public.feedbacks 
FOR SELECT 
USING (has_role(auth.uid(), 'proprietor'::app_role));

-- notification_reads table policies
DROP POLICY IF EXISTS "Super admins can view all notification reads" ON public.notification_reads;

CREATE POLICY "Proprietors can view all notification reads" 
ON public.notification_reads 
FOR SELECT 
USING (has_role(auth.uid(), 'proprietor'::app_role));

-- notifications table policies
DROP POLICY IF EXISTS "Super admins can manage notifications" ON public.notifications;

CREATE POLICY "Proprietors can manage notifications" 
ON public.notifications 
FOR ALL 
USING (has_role(auth.uid(), 'proprietor'::app_role))
WITH CHECK (has_role(auth.uid(), 'proprietor'::app_role));

-- support_messages table policies
DROP POLICY IF EXISTS "Super admins can send messages to any ticket" ON public.support_messages;

CREATE POLICY "Proprietors can send messages to any ticket" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'proprietor'::app_role));

-- support_tickets table policies
DROP POLICY IF EXISTS "Super admins can manage all tickets" ON public.support_tickets;

CREATE POLICY "Proprietors can manage all tickets" 
ON public.support_tickets 
FOR ALL 
USING (has_role(auth.uid(), 'proprietor'::app_role))
WITH CHECK (has_role(auth.uid(), 'proprietor'::app_role));

-- user_roles table policies
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Proprietors can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (has_role(auth.uid(), 'proprietor'::app_role))
WITH CHECK (has_role(auth.uid(), 'proprietor'::app_role));

-- study_suggestions table policies
DROP POLICY IF EXISTS "Admins can manage study suggestions" ON public.study_suggestions;

CREATE POLICY "Proprietors can manage study suggestions" 
ON public.study_suggestions 
FOR ALL 
USING (has_role(auth.uid(), 'proprietor'::app_role));