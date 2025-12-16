-- SECURITY FIX: Remove overly permissive RLS policies on clients table
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;
DROP POLICY IF EXISTS "Authenticated users can delete clients" ON public.clients;

-- Add admin override policies so admins can manage all clients
CREATE POLICY "Admins can view all clients"
ON public.clients FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all clients"
ON public.clients FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all clients"
ON public.clients FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- SECURITY FIX: Make chat-files bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'chat-files';

-- Drop the overly permissive storage policy
DROP POLICY IF EXISTS "Anyone can view chat files" ON storage.objects;

-- Create secure storage policy for viewing chat-files
CREATE POLICY "Auth users can view chat files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-files' AND
  auth.uid() IS NOT NULL
);