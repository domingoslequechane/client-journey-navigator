-- =============================================
-- FINAL SECURITY FIX - REMAINING VULNERABILITIES
-- =============================================

-- =============================================
-- 1. AI_CONVERSATIONS - FIX GLOBAL ADMIN ACCESS
-- =============================================
DROP POLICY IF EXISTS "Users can create conversations for own clients" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can update own client conversations" ON public.ai_conversations;
DROP POLICY IF EXISTS "Users can view own client conversations" ON public.ai_conversations;

-- Create secure policies with organization check
CREATE POLICY "Users can view organization client conversations"
ON public.ai_conversations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = ai_conversations.client_id
    AND c.organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

CREATE POLICY "Users can create organization client conversations"
ON public.ai_conversations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = ai_conversations.client_id
    AND c.organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

CREATE POLICY "Users can update organization client conversations"
ON public.ai_conversations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = ai_conversations.client_id
    AND c.organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

-- Proprietor access for system management
CREATE POLICY "Proprietors can manage all conversations"
ON public.ai_conversations
FOR ALL
USING (has_role(auth.uid(), 'proprietor'))
WITH CHECK (has_role(auth.uid(), 'proprietor'));

-- =============================================
-- 2. AI_MESSAGES - FIX GLOBAL ADMIN ACCESS
-- =============================================
DROP POLICY IF EXISTS "Users can create messages in accessible conversations" ON public.ai_messages;
DROP POLICY IF EXISTS "Users can view messages for accessible conversations" ON public.ai_messages;

-- Create secure policies with organization check
CREATE POLICY "Users can view organization ai messages"
ON public.ai_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.ai_conversations conv
    JOIN public.clients c ON c.id = conv.client_id
    WHERE conv.id = ai_messages.conversation_id
    AND c.organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

CREATE POLICY "Users can create organization ai messages"
ON public.ai_messages
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ai_conversations conv
    JOIN public.clients c ON c.id = conv.client_id
    WHERE conv.id = ai_messages.conversation_id
    AND c.organization_id IS NOT NULL
    AND user_belongs_to_org(auth.uid(), c.organization_id)
  )
);

-- Proprietor access
CREATE POLICY "Proprietors can manage all ai messages"
ON public.ai_messages
FOR ALL
USING (has_role(auth.uid(), 'proprietor'))
WITH CHECK (has_role(auth.uid(), 'proprietor'));

-- =============================================
-- 3. AGENCY_SETTINGS - FIX GLOBAL ADMIN ACCESS
-- This table appears obsolete (organizations table has same fields)
-- But we'll secure it anyway
-- =============================================
DROP POLICY IF EXISTS "Admins can manage agency settings" ON public.agency_settings;
DROP POLICY IF EXISTS "Authenticated users can view agency settings" ON public.agency_settings;

-- Only proprietors can manage this legacy table
CREATE POLICY "Proprietors can manage agency settings"
ON public.agency_settings
FOR ALL
USING (has_role(auth.uid(), 'proprietor'))
WITH CHECK (has_role(auth.uid(), 'proprietor'));

-- =============================================
-- 4. SUPPORT_MESSAGES - FIX INCORRECT ROLE CHECK
-- The policy was checking has_role('admin') which checks app_role enum
-- But organization admins are stored in profiles.role as user_role type
-- =============================================
DROP POLICY IF EXISTS "Users can view messages from own tickets" ON public.support_messages;

-- Fix: Users can only view messages from their own tickets OR proprietors
CREATE POLICY "Users can view own ticket messages"
ON public.support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets
    WHERE support_tickets.id = support_messages.ticket_id
    AND support_tickets.user_id = auth.uid()
  )
);

CREATE POLICY "Proprietors can view all support messages"
ON public.support_messages
FOR SELECT
USING (has_role(auth.uid(), 'proprietor'));

-- =============================================
-- 5. STUDY_SUGGESTIONS - ADD ORGANIZATION ISOLATION
-- Currently any authenticated user sees ALL study suggestions
-- Need to add organization_id column and isolate
-- =============================================
-- First, add organization_id column if it doesn't exist
ALTER TABLE public.study_suggestions 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- Drop insecure policies
DROP POLICY IF EXISTS "Authenticated users can view study suggestions" ON public.study_suggestions;
DROP POLICY IF EXISTS "Authenticated users can insert study suggestions" ON public.study_suggestions;
DROP POLICY IF EXISTS "Authenticated users can delete study suggestions" ON public.study_suggestions;
DROP POLICY IF EXISTS "Proprietors can manage study suggestions" ON public.study_suggestions;

-- Create secure policies with organization isolation
CREATE POLICY "Users can view organization study suggestions"
ON public.study_suggestions
FOR SELECT
USING (
  organization_id IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can create organization study suggestions"
ON public.study_suggestions
FOR INSERT
WITH CHECK (
  organization_id IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), organization_id)
);

CREATE POLICY "Users can delete organization study suggestions"
ON public.study_suggestions
FOR DELETE
USING (
  organization_id IS NOT NULL 
  AND user_belongs_to_org(auth.uid(), organization_id)
);

-- Proprietors can manage all
CREATE POLICY "Proprietors can manage all study suggestions"
ON public.study_suggestions
FOR ALL
USING (has_role(auth.uid(), 'proprietor'))
WITH CHECK (has_role(auth.uid(), 'proprietor'));

-- =============================================
-- 6. EMAIL_OTPS - CREATE PROPER POLICIES
-- This table is used during signup before user has an account
-- Edge functions use service_role to insert/verify
-- Regular users should NOT have direct access
-- =============================================
-- No user-facing policies needed - edge functions use service_role
-- Just create a restrictive default that blocks all user access
CREATE POLICY "No direct user access to email_otps"
ON public.email_otps
FOR ALL
USING (false)
WITH CHECK (false);

-- =============================================
-- 7. ADD PROPRIETOR POLICIES TO LOGIN_HISTORY
-- =============================================
CREATE POLICY "Proprietors can view all login history"
ON public.login_history
FOR SELECT
USING (has_role(auth.uid(), 'proprietor'));