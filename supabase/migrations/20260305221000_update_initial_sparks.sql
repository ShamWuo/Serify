-- Migration to update initial spark allocation from 15 to 1

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create the profile first
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
  
  -- Create initial balances row (Updated: 1 spark)
  INSERT INTO public.spark_balances (user_id, trial_sparks, topup_sparks, subscription_sparks)
  VALUES (new.id, 1, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Log the transaction (Updated: 1 spark)
  INSERT INTO public.spark_transactions (user_id, amount, pool, transaction_type, action, balance_after)
  VALUES (new.id, 1, 'trial', 'trial_grant', 'signup', 1);

  -- Record the grant (Updated: 1 spark)
  INSERT INTO public.spark_grants (user_id, reason, sparks_granted, sparks_remaining, expires_at)
  VALUES (new.id, 'signup', 1, 1, NOW() + INTERVAL '14 days');

  RETURN NEW;
END;
$$;
