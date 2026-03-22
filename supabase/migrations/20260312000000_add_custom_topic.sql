-- Migration: Add custom_topic to practice_sessions
ALTER TABLE public.practice_sessions ADD COLUMN IF NOT EXISTS custom_topic TEXT;

COMMENT ON COLUMN public.practice_sessions.custom_topic IS 'Stores the ad-hoc topic or pasted content if the session was started without specific Vault concept IDs.';
