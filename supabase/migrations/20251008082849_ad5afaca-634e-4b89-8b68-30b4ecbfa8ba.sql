-- Add provider column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'MTN';

-- Add comment
COMMENT ON COLUMN public.profiles.provider IS 'Mobile money provider: MTN or AIRTEL';