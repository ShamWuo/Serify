-- Serify Unified Usage System Migration
-- Path: supabase/migrations/20260312010000_unified_usage.sql

-- 1. Update usage_tracking with single token counter and breakdown columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_tracking' AND column_name='tokens_used') THEN
        ALTER TABLE usage_tracking ADD COLUMN tokens_used INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_tracking' AND column_name='monthly_limit') THEN
        ALTER TABLE usage_tracking ADD COLUMN monthly_limit INTEGER DEFAULT 50;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_tracking' AND column_name='tokens_from_sessions') THEN
        ALTER TABLE usage_tracking ADD COLUMN tokens_from_sessions INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_tracking' AND column_name='tokens_from_ai_messages') THEN
        ALTER TABLE usage_tracking ADD COLUMN tokens_from_ai_messages INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_tracking' AND column_name='tokens_from_flashcards') THEN
        ALTER TABLE usage_tracking ADD COLUMN tokens_from_flashcards INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_tracking' AND column_name='tokens_from_flow_mode') THEN
        ALTER TABLE usage_tracking ADD COLUMN tokens_from_flow_mode INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_tracking' AND column_name='tokens_from_practice') THEN
        ALTER TABLE usage_tracking ADD COLUMN tokens_from_practice INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_tracking' AND column_name='tokens_from_deep_dives') THEN
        ALTER TABLE usage_tracking ADD COLUMN tokens_from_deep_dives INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_tracking' AND column_name='tokens_from_learn_mode') THEN
        ALTER TABLE usage_tracking ADD COLUMN tokens_from_learn_mode INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='usage_tracking' AND column_name='tokens_from_other') THEN
        ALTER TABLE usage_tracking ADD COLUMN tokens_from_other INTEGER DEFAULT 0;
    END IF;
END $$;

-- 2. Create token_costs table if it doesn't exist
CREATE TABLE IF NOT EXISTS token_costs (
  action VARCHAR(50) PRIMARY KEY,
  token_cost INTEGER NOT NULL,
  is_free BOOLEAN DEFAULT FALSE,
  description TEXT
);

-- Seed token costs (Upsert to allow re-running)
INSERT INTO token_costs (action, token_cost, is_free, description) VALUES
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

-- 3. Token transaction log (for debugging and analytics)
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50) REFERENCES token_costs(action),
  tokens_consumed INTEGER NOT NULL,
  tokens_before INTEGER NOT NULL,
  tokens_after INTEGER NOT NULL,
  reference_id UUID, -- session_id, practice_session_id, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Single atomic consumption RPC
CREATE OR REPLACE FUNCTION consume_tokens(
    p_user_id UUID,
    p_action TEXT,
    p_category TEXT,
    p_reference_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost INTEGER;
    v_tokens_used INTEGER;
    v_monthly_limit INTEGER;
    v_plan TEXT;
    v_allowed BOOLEAN;
    v_tokens_before INTEGER;
BEGIN
    -- Get current tracking info
    SELECT tokens_used, monthly_limit, plan 
    INTO v_tokens_used, v_monthly_limit, v_plan
    FROM usage_tracking
    WHERE user_id = p_user_id;

    -- Pro+ is always allowed and costs 0
    IF v_plan = 'proplus' THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'cost', 0,
            'tokens_used', v_tokens_used,
            'monthly_limit', null,
            'plan', v_plan
        );
    END IF;

    -- Get action cost
    SELECT token_cost INTO v_cost
    FROM token_costs
    WHERE action = p_action;

    -- Free actions always allowed
    IF v_cost = 0 THEN
        RETURN jsonb_build_object(
            'allowed', true,
            'cost', 0,
            'tokens_used', v_tokens_used,
            'monthly_limit', v_monthly_limit,
            'plan', v_plan
        );
    END IF;

    -- Check affordability
    v_tokens_before := v_tokens_used;
    IF v_tokens_used + v_cost <= v_monthly_limit THEN
        -- Execute update
        EXECUTE format('UPDATE usage_tracking SET tokens_used = tokens_used + $1, tokens_from_%I = tokens_from_%I + $1, updated_at = NOW() WHERE user_id = $2', p_category, p_category)
        USING v_cost, p_user_id;

        -- Log transaction
        INSERT INTO token_transactions (user_id, action, tokens_consumed, tokens_before, tokens_after, reference_id)
        VALUES (p_user_id, p_action, v_cost, v_tokens_before, v_tokens_before + v_cost, p_reference_id);

        RETURN jsonb_build_object(
            'allowed', true,
            'cost', v_cost,
            'tokens_used', v_tokens_before + v_cost,
            'monthly_limit', v_monthly_limit,
            'plan', v_plan
        );
    ELSE
        RETURN jsonb_build_object(
            'allowed', false,
            'cost', v_cost,
            'tokens_used', v_tokens_before,
            'monthly_limit', v_monthly_limit,
            'plan', v_plan
        );
    END IF;
END;
$$;
