-- Create table to store OTP codes for email verification
CREATE TABLE public.email_otps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_email_otps_email ON public.email_otps(email);
CREATE INDEX idx_email_otps_expires_at ON public.email_otps(expires_at);

-- Enable RLS
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

-- No public access - only edge functions with service role can access
-- This is intentional as OTPs should only be managed server-side