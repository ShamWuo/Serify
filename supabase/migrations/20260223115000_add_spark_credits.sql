-- Up Migration

-- spark_transactions
CREATE TABLE IF NOT EXISTS public.spark_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  pool VARCHAR(20) NOT NULL,
  transaction_type VARCHAR(30), 
  action VARCHAR(50),
  reference_id TEXT,
  stripe_payment_intent_id VARCHAR(255),
  balance_after INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- spark_balances
CREATE TABLE IF NOT EXISTS public.spark_balances (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_sparks INTEGER DEFAULT 0,
  topup_sparks INTEGER DEFAULT 0,
  trial_sparks INTEGER DEFAULT 0,
  total_sparks INTEGER GENERATED ALWAYS AS (subscription_sparks + topup_sparks + trial_sparks) STORED,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- spark_purchases
CREATE TABLE IF NOT EXISTS public.spark_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  pack_id VARCHAR(50),
  sparks_granted INTEGER,
  sparks_remaining INTEGER,
  price_cents INTEGER,
  stripe_payment_intent_id VARCHAR(255),
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- spark_grants
CREATE TABLE IF NOT EXISTS public.spark_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason VARCHAR(50),
  sparks_granted INTEGER,
  sparks_remaining INTEGER,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- RLS
ALTER TABLE public.spark_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spark_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spark_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spark_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own spark transactions" ON public.spark_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own spark balances" ON public.spark_balances FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own spark purchases" ON public.spark_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own spark grants" ON public.spark_grants FOR SELECT USING (auth.uid() = user_id);

-- Unified handle_new_user to issue trial sparks and create profile
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
  ON CONFLICT (id) DO NOTHING;
  
  -- Create initial balances row
  INSERT INTO public.spark_balances (user_id, trial_sparks, topup_sparks, subscription_sparks)
  VALUES (new.id, 15, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Log the transaction
  INSERT INTO public.spark_transactions (user_id, amount, pool, transaction_type, action, balance_after)
  VALUES (new.id, 15, 'trial', 'trial_grant', 'signup', 15);

  -- Record the grant
  INSERT INTO public.spark_grants (user_id, reason, sparks_granted, sparks_remaining, expires_at)
  VALUES (new.id, 'signup', 15, 15, NOW() + INTERVAL '14 days');

  RETURN NEW;
END;
$$;

-- Backfill existing profiles
INSERT INTO public.spark_balances (user_id, trial_sparks, topup_sparks, subscription_sparks)
SELECT id, 15, 0, 0 FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.spark_grants (user_id, reason, sparks_granted, sparks_remaining, expires_at)
SELECT id, 'signup_backfill', 15, 15, NOW() + INTERVAL '14 days' FROM public.profiles
WHERE NOT EXISTS (SELECT 1 FROM public.spark_grants WHERE public.spark_grants.user_id = public.profiles.id);

INSERT INTO public.spark_transactions (user_id, amount, pool, transaction_type, action, balance_after)
SELECT id, 15, 'trial', 'trial_grant', 'signup_backfill', 15 FROM public.profiles
WHERE NOT EXISTS (SELECT 1 FROM public.spark_transactions WHERE public.spark_transactions.user_id = public.profiles.id);


-- Deduct Sparks RPC
CREATE OR REPLACE FUNCTION deduct_sparks(
  p_user_id UUID,
  p_amount INTEGER,
  p_action VARCHAR,
  p_reference_id TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance RECORD;
  v_remaining INTEGER := p_amount;
  v_deduct_trial INTEGER := 0;
  v_deduct_topup INTEGER := 0;
  v_deduct_subscription INTEGER := 0;
  v_total_after INTEGER;
  v_tmp_deduct INTEGER;
  v_record RECORD;
BEGIN
  -- Lock the balance row
  SELECT * INTO v_balance 
  FROM public.spark_balances 
  WHERE user_id = p_user_id 
  FOR UPDATE;

  -- If no balance row exists, pretend it has 0
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'remainingBalance', 0);
  END IF;

  -- Check if enough sparks
  IF v_balance.total_sparks < v_remaining THEN
    RETURN jsonb_build_object('success', false, 'remainingBalance', v_balance.total_sparks);
  END IF;

  -- 1. Deduct Trial Sparks
  IF v_remaining > 0 AND v_balance.trial_sparks > 0 THEN
    v_deduct_trial := LEAST(v_remaining, v_balance.trial_sparks);
    v_remaining := v_remaining - v_deduct_trial;
    
    INSERT INTO public.spark_transactions (user_id, amount, pool, transaction_type, action, reference_id, balance_after)
    VALUES (p_user_id, -v_deduct_trial, 'trial', 'action_debit', p_action, p_reference_id, (v_balance.total_sparks - v_deduct_trial));
    
    -- FIFO for grants
    DECLARE
       v_grant_rem INTEGER := v_deduct_trial;
    BEGIN
       FOR v_record IN 
           SELECT * FROM public.spark_grants 
           WHERE user_id = p_user_id AND sparks_remaining > 0 
           ORDER BY expires_at ASC 
           FOR UPDATE
       LOOP
           IF v_grant_rem <= 0 THEN EXIT; END IF;
           v_tmp_deduct := LEAST(v_record.sparks_remaining, v_grant_rem);
           UPDATE public.spark_grants SET sparks_remaining = sparks_remaining - v_tmp_deduct WHERE id = v_record.id;
           v_grant_rem := v_grant_rem - v_tmp_deduct;
       END LOOP;
    END;
  END IF;

  -- 2. Deduct TopUp Sparks
  IF v_remaining > 0 AND v_balance.topup_sparks > 0 THEN
    v_deduct_topup := LEAST(v_remaining, v_balance.topup_sparks);
    v_remaining := v_remaining - v_deduct_topup;
    
    INSERT INTO public.spark_transactions (user_id, amount, pool, transaction_type, action, reference_id, balance_after)
    VALUES (p_user_id, -v_deduct_topup, 'topup', 'action_debit', p_action, p_reference_id, (v_balance.total_sparks - v_deduct_trial - v_deduct_topup));
    
    -- FIFO for purchases
    DECLARE
       v_purchase_rem INTEGER := v_deduct_topup;
    BEGIN
       FOR v_record IN 
           SELECT * FROM public.spark_purchases 
           WHERE user_id = p_user_id AND sparks_remaining > 0 
           ORDER BY purchased_at ASC 
           FOR UPDATE
       LOOP
           IF v_purchase_rem <= 0 THEN EXIT; END IF;
           v_tmp_deduct := LEAST(v_record.sparks_remaining, v_purchase_rem);
           UPDATE public.spark_purchases SET sparks_remaining = sparks_remaining - v_tmp_deduct WHERE id = v_record.id;
           v_purchase_rem := v_purchase_rem - v_tmp_deduct;
       END LOOP;
    END;
  END IF;

  -- 3. Deduct Subscription Sparks
  IF v_remaining > 0 AND v_balance.subscription_sparks > 0 THEN
    v_deduct_subscription := LEAST(v_remaining, v_balance.subscription_sparks);
    v_remaining := v_remaining - v_deduct_subscription;
    
    INSERT INTO public.spark_transactions (user_id, amount, pool, transaction_type, action, reference_id, balance_after)
    VALUES (p_user_id, -v_deduct_subscription, 'subscription', 'action_debit', p_action, p_reference_id, (v_balance.total_sparks - v_deduct_trial - v_deduct_topup - v_deduct_subscription));
  END IF;

  -- Update balances
  UPDATE public.spark_balances 
  SET 
    trial_sparks = trial_sparks - v_deduct_trial,
    topup_sparks = topup_sparks - v_deduct_topup,
    subscription_sparks = subscription_sparks - v_deduct_subscription,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  v_total_after := v_balance.total_sparks - p_amount;
  
  RETURN jsonb_build_object('success', true, 'remainingBalance', v_total_after);
END;
$$;

-- Add Top-Up Sparks RPC
CREATE OR REPLACE FUNCTION add_topup_sparks(
  p_user_id UUID,
  p_amount INTEGER,
  p_stripe_payment_intent_id VARCHAR
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance RECORD;
  v_total_after INTEGER;
BEGIN
  -- Lock the balance row
  SELECT * INTO v_balance 
  FROM public.spark_balances 
  WHERE user_id = p_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false);
  END IF;

  -- Update balances
  UPDATE public.spark_balances 
  SET 
    topup_sparks = topup_sparks + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  v_total_after := v_balance.total_sparks + p_amount;

  -- Insert Purchase
  INSERT INTO public.spark_purchases (user_id, sparks_granted, sparks_remaining, stripe_payment_intent_id)
  VALUES (p_user_id, p_amount, p_amount, p_stripe_payment_intent_id);

  -- Log Transaction
  INSERT INTO public.spark_transactions (user_id, amount, pool, transaction_type, action, stripe_payment_intent_id, balance_after)
  VALUES (p_user_id, p_amount, 'topup', 'grant', 'topup_purchase', p_stripe_payment_intent_id, v_total_after);

  RETURN jsonb_build_object('success', true, 'newBalance', v_total_after);
END;
$$;

-- Refresh Subscription Sparks RPC
CREATE OR REPLACE FUNCTION refresh_subscription_sparks(
  p_user_id UUID,
  p_amount INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance RECORD;
  v_total_after INTEGER;
  v_previous_subs INTEGER;
BEGIN
  -- Lock the balance row
  SELECT * INTO v_balance 
  FROM public.spark_balances 
  WHERE user_id = p_user_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false);
  END IF;

  v_previous_subs := v_balance.subscription_sparks;

  -- Expire old subs if any
  IF v_previous_subs > 0 THEN
    INSERT INTO public.spark_transactions (user_id, amount, pool, transaction_type, action, balance_after)
    VALUES (p_user_id, -v_previous_subs, 'subscription', 'expiry', 'subscription_refresh_expiry', (v_balance.total_sparks - v_previous_subs));
  END IF;

  -- Update balances
  UPDATE public.spark_balances 
  SET 
    subscription_sparks = p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  v_total_after := v_balance.total_sparks - v_previous_subs + p_amount;

  -- Log Transaction
  INSERT INTO public.spark_transactions (user_id, amount, pool, transaction_type, action, balance_after)
  VALUES (p_user_id, p_amount, 'subscription', 'grant', 'subscription_refresh_grant', v_total_after);

  RETURN jsonb_build_object('success', true, 'newBalance', v_total_after);
END;
$$;
