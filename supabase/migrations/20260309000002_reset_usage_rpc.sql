CREATE OR REPLACE FUNCTION reset_expired_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE usage_tracking
  SET 
    sessions_used = 0,
    flashcards_used = 0,
    quizzes_used = 0,
    ai_messages_used = 0,
    flow_sessions_used = 0,
    curricula_used = 0,
    deep_dives_used = 0,
    period_start = NOW(),
    period_end = NOW() + INTERVAL '1 month',
    updated_at = NOW()
  WHERE period_end < NOW();
END;
$$;
