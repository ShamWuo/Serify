CREATE OR REPLACE FUNCTION increment_usage(target_user_id UUID, feature_name TEXT, amount INT DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF feature_name = 'sessions' THEN
    UPDATE usage_tracking SET sessions_used = sessions_used + amount WHERE user_id = target_user_id;
  ELSIF feature_name = 'flashcards' THEN
    UPDATE usage_tracking SET flashcards_used = flashcards_used + amount WHERE user_id = target_user_id;
  ELSIF feature_name = 'quizzes' THEN
    UPDATE usage_tracking SET quizzes_used = quizzes_used + amount WHERE user_id = target_user_id;
  ELSIF feature_name = 'ai_messages' THEN
    UPDATE usage_tracking SET ai_messages_used = ai_messages_used + amount WHERE user_id = target_user_id;
  ELSIF feature_name = 'flow_sessions' THEN
    UPDATE usage_tracking SET flow_sessions_used = flow_sessions_used + amount WHERE user_id = target_user_id;
  ELSIF feature_name = 'curricula' THEN
    UPDATE usage_tracking SET curricula_used = curricula_used + amount WHERE user_id = target_user_id;
  ELSIF feature_name = 'deep_dives' THEN
    UPDATE usage_tracking SET deep_dives_used = deep_dives_used + amount WHERE user_id = target_user_id;
  ELSIF feature_name = 'vault_concepts' THEN
    UPDATE usage_tracking SET vault_concept_count = vault_concept_count + amount WHERE user_id = target_user_id;
  END IF;
END;
$$;
