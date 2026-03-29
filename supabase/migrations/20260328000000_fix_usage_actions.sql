-- Fix mismatches between code action names and database seed data
-- Path: supabase/migrations/20260328000000_fix_usage_actions.sql

-- 1. Ensure all used action names are in token_costs
INSERT INTO public.token_costs (action, token_cost, is_free, description) VALUES
  ('flow_sessions',          8, false, 'Flow Mode concept session'),
  ('curricula',               2, false, 'Curriculum generation'),
  ('practice_test_generation', 5, false, 'Practice test generation'),
  ('practice_quiz_generation', 3, false, 'Practice quiz generation'),
  ('practice_exam_generation', 10, false, 'Exam simulation generation'),
  ('practice_comprehensive_generation', 10, false, 'Comprehensive test generation'),
  ('practice_flashcards_generation', 3, false, 'Practice flashcards generation'),
  ('practice_scenario_generation', 5, false, 'Scenario practice generation')
ON CONFLICT (action) DO UPDATE SET 
  token_cost = EXCLUDED.token_cost, 
  is_free = EXCLUDED.is_free, 
  description = EXCLUDED.description;

-- 2. Backfill usage_tracking for any users who might be missing it
INSERT INTO public.usage_tracking (user_id, plan, monthly_limit)
SELECT id, 'free', 50
FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- 3. Update the consume_tokens RPC to handle missing tracking rows more gracefully
-- (Though the backfill above and the handle_new_user trigger should prevent this)
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
    v_period_end TIMESTAMP WITH TIME ZONE;
    v_allowed BOOLEAN;
    v_tokens_before INTEGER;
BEGIN
    -- Get current tracking info
    SELECT tokens_used, monthly_limit, plan, period_end
    INTO v_tokens_used, v_monthly_limit, v_plan, v_period_end
    FROM usage_tracking
    WHERE user_id = p_user_id;

    -- If no tracking found, create it
    IF v_tokens_used IS NULL THEN
        INSERT INTO usage_tracking (user_id, plan, monthly_limit, tokens_used, period_start, period_end)
        VALUES (p_user_id, 'free', 50, 0, NOW(), NOW() + INTERVAL '1 month')
        RETURNING tokens_used, monthly_limit, plan, period_end INTO v_tokens_used, v_monthly_limit, v_plan, v_period_end;
    END IF;

    -- Check for period reset
    IF NOW() > v_period_end THEN
        UPDATE usage_tracking 
        SET tokens_used = 0,
            tokens_from_sessions = 0,
            tokens_from_ai_messages = 0,
            tokens_from_flashcards = 0,
            tokens_from_flow_mode = 0,
            tokens_from_practice = 0,
            tokens_from_deep_dives = 0,
            tokens_from_learn_mode = 0,
            tokens_from_other = 0,
            period_start = NOW(),
            period_end = NOW() + INTERVAL '1 month',
            updated_at = NOW()
        WHERE user_id = p_user_id;
        
        v_tokens_used := 0;
        v_period_end := NOW() + INTERVAL '1 month';
    END IF;

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

    -- If action not found, default to 1
    IF v_cost IS NULL THEN
        v_cost := 1; 
    END IF;

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
