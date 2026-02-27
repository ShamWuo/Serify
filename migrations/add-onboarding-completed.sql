-- Add onboarding_completed column to profiles table
-- This migration adds a column to track whether a user has completed onboarding

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'onboarding_completed'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Update existing users to have onboarding_completed = false (they'll need to complete onboarding)
UPDATE public.profiles 
SET onboarding_completed = false 
WHERE onboarding_completed IS NULL;
