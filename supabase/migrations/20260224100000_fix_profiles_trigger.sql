-- Migration to ensure the profiles table is correctly populated on auth signup
-- This migration fixes the trigger function to match the 'profiles' table schema

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, subscription_tier, onboarding_completed, preferences)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', 'User'), 
    'free', 
    false, 
    '{"tone": "supportive", "questionCount": 6}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name;
  RETURN NEW;
END;
$$;

-- Note: The column name for onboarding might be 'onboarding_completed' or 'onboarded' 
-- based on common patterns, but db_types_new.ts says 'onboarding_completed'.
-- Let's double check db_types_new.ts again.
