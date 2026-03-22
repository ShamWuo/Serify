-- Serify Unified Usage System
-- Replaces previous fragmented tracking with a single token-based economy

-- 1. Token Cost Reference Table
CREATE TABLE IF NOT EXISTS public.token_costs (
  action VARCHAR(50) PRIMARY KEY,
  token_cost INTEGER NOT NULL,
  is_free BOOLEAN DEFAULT FALSE,
  description TEXT
);

-- Seed token costs
INSERT INTO public.token_costs (action, token_cost, is_free, description) VALUES
  ('session_standard',      13, false, 'Full session analysis'),
  ('session_pdf',           15, false, 'Session analysis with PDF'),
  ('ai_message_tier1',       0, true,  'Navigation/UI question'),
  ('ai_message_tier2',       1, false, 'Standard AI query'),
  ('ai_message_tier3',       3, false, 'Deep AI explanation'),
  ('flow_mode_session',      8, false, 'Flow Mode concept session'),
  ('flow_mode_step',         1, false, 'Individual Flow Mode step'),
  ('learn_mode_curriculum',  2, false, 'Curriculum generation'),
  ('flashcard_generation',   2, false, 'Flashcard deck'),
  ('practice_exam',         10, false, 'Exam simulation'),
  ('practice_scenario',      5, false, 'Scenario practice'),
  ('practice_review',        0, true,  'Spaced repetition review'),
  ('practice_pdf_export',    0, true,  'PDF export'),
  ('practice_quiz',          3, false, 'Practice quiz generation'),
  ('deep_dive',              5, false, 'Deep Dive generation'),
  ('manual_synthesis',       2, false, 'Manual Vault concept synthesis')
ON CONFLICT (action) DO UPDATE SET token_cost = EXCLUDED.token_cost, is_free = EXCLUDED.is_free, description = EXCLUDED.description;

-- 2. Clean up old tracking if exists and create new structure
-- We keep user_id to preserve identity but reset usage patterns to the new token system.
ALTER TABLE IF EXISTS public.usage_tracking 
  DROP COLUMN IF EXISTS sessions_used,
  DROP COLUMN IF EXISTS ai_messages_used,
  DROP COLUMN IF EXISTS flashcards_used,
  DROP COLUMN IF EXISTS flow_sessions_used,
  DROP COLUMN IF EXISTS curricula_used,
  DROP COLUMN IF EXISTS deep_dives_used,
  DROP COLUMN IF EXISTS quizzes_used;

-- Add new unified columns
ALTER TABLE public.usage_tracking
  ADD COLUMN IF NOT EXISTS tokens_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS period_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS period_end TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month'),
  ADD COLUMN IF NOT EXISTS tokens_from_sessions INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_from_ai_messages INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_from_flashcards INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_from_flow_mode INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_from_practice INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_from_deep_dives INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_from_learn_mode INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tokens_from_other INTEGER DEFAULT 0;

-- 3. Token Transaction Log
CREATE TABLE IF NOT EXISTS public.token_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR(50) REFERENCES public.token_costs(action),
  tokens_consumed INTEGER NOT NULL,
  tokens_before INTEGER NOT NULL,
  tokens_after INTEGER NOT NULL,
  reference_id UUID, -- session_id, practice_session_id, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.token_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.token_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view token costs" ON public.token_costs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view their own transactions" ON public.token_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 5. Helper Function for atomic token consumption
CREATE OR REPLACE FUNCTION public.consume_tokens(
  p_user_id UUID,
  p_action VARCHAR(50),
  p_category VARCHAR(50),
  p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cost INTEGER;
  v_tokens_before INTEGER;
  v_limit INTEGER;
  v_plan VARCHAR(20);
  v_allowed BOOLEAN;
  v_result JSONB;
BEGIN
  -- 1. Get cost
  SELECT token_cost INTO v_cost FROM public.token_costs WHERE action = p_action;
  IF v_cost IS NULL THEN
    RAISE EXCEPTION 'Action % not found in token_costs', p_action;
  END IF;

  -- 2. Get current usage and plan
  SELECT tokens_used, monthly_limit, plan INTO v_tokens_before, v_limit, v_plan 
  FROM public.usage_tracking 
  WHERE user_id = p_user_id;

  -- Pro+ always allowed
  IF v_plan = 'proplus' THEN
    v_allowed := TRUE;
    v_cost := 0; -- No cost for Pro+
  ELSE
    -- Check if free action or within limit
    IF v_cost = 0 OR (v_tokens_before + v_cost <= v_limit) THEN
      v_allowed := TRUE;
    ELSE
      v_allowed := FALSE;
    END IF;
  END IF;

  IF v_allowed AND v_cost > 0 THEN
    -- Update usage
    EXECUTE format('UPDATE public.usage_tracking SET tokens_used = tokens_used + $1, tokens_from_%I = tokens_from_%I + $1, updated_at = NOW() WHERE user_id = $2', p_category, p_category)
    USING v_cost, p_user_id;

    -- Log transaction
    INSERT INTO public.token_transactions (user_id, action, tokens_consumed, tokens_before, tokens_after, reference_id)
    VALUES (p_user_id, p_action, v_cost, v_tokens_before, v_tokens_before + v_cost, p_reference_id);
  END IF;

  SELECT jsonb_build_object(
    'allowed', v_allowed,
    'cost', v_cost,
    'tokens_used', CASE WHEN v_allowed THEN v_tokens_before + v_cost ELSE v_tokens_before END,
    'monthly_limit', v_limit
  ) INTO v_result;

  RETURN v_result;
END;
$$;
