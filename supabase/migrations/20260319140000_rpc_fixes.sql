-- 1. increment_card_stats
-- Increments card counters and updates the parent deck aggregate stats.
CREATE OR REPLACE FUNCTION public.increment_card_stats(p_card_id UUID, p_is_correct BOOLEAN)
RETURNS VOID AS $$
DECLARE
  v_deck_id UUID;
BEGIN
  -- Get the deck_id for this card
  SELECT deck_id INTO v_deck_id FROM public.flashcards WHERE id = p_card_id;

  -- 1. Update the card itself
  UPDATE public.flashcards
  SET 
    times_seen = COALESCE(times_seen, 0) + 1,
    times_correct = CASE WHEN p_is_correct THEN COALESCE(times_correct, 0) + 1 ELSE COALESCE(times_correct, 0) END,
    times_incorrect = CASE WHEN NOT p_is_correct THEN COALESCE(times_incorrect, 0) + 1 ELSE COALESCE(times_incorrect, 0) END,
    last_seen_at = now(),
    updated_at = now()
  WHERE id = p_card_id;

  -- 2. Update the parent deck aggregate stats
  IF v_deck_id IS NOT NULL THEN
    UPDATE public.flashcard_decks
    SET 
      cards_know_it = (
        SELECT count(*) FROM public.flashcards 
        WHERE deck_id = v_deck_id AND (times_correct::float / NULLIF(times_seen, 0)) >= 0.8
      ),
      cards_still_learning = (
        SELECT count(*) FROM public.flashcards 
        WHERE deck_id = v_deck_id AND (times_correct::float / NULLIF(times_seen, 0)) < 0.8 AND times_seen > 0
      ),
      cards_not_studied = (
        SELECT count(*) FROM public.flashcards 
        WHERE deck_id = v_deck_id AND times_seen = 0
      ),
      last_studied_at = now(),
      updated_at = now()
    WHERE id = v_deck_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. record_ai_message
-- Logs AI usage to tracking tables. 
-- Note: This is separate from gating (consume_tokens) to allow tracking successful completions.
CREATE OR REPLACE FUNCTION public.record_ai_message(
  p_user_id UUID,
  p_message_type VARCHAR,
  p_token_count INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_tokens_before INTEGER;
BEGIN
  -- Get current tokens
  SELECT tokens_used INTO v_tokens_before FROM public.usage_tracking WHERE user_id = p_user_id;
  
  -- Update categorization counter
  UPDATE public.usage_tracking
  SET 
    tokens_from_ai_messages = tokens_from_ai_messages + p_token_count,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log transaction if tokens were involved
  IF p_token_count > 0 THEN
      INSERT INTO public.token_transactions (user_id, action, tokens_consumed, tokens_before, tokens_after)
      VALUES (p_user_id, p_message_type, p_token_count, v_tokens_before, v_tokens_before + p_token_count)
      ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
