-- Up Migration

-- Add new columns to public.profiles for onboarding
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS user_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS learning_context TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS guidance_answer_dismissed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_frequency VARCHAR(20),
  ADD COLUMN IF NOT EXISTS reminder_declined BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP WITH TIME ZONE;
