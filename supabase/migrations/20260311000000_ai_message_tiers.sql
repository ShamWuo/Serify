-- Add AI message tier tracking columns to usage_tracking table
ALTER TABLE usage_tracking
  ADD COLUMN ai_messages_tier1_count INTEGER DEFAULT 0,
  ADD COLUMN ai_messages_tier2_count INTEGER DEFAULT 0,
  ADD COLUMN ai_messages_tier3_count INTEGER DEFAULT 0;

-- Drop the old increment_usage to safely update it
-- Actually, the old increment_usage handles many different features. Let's just create a new function
-- or replace the existing one since we need to do atomic cost increments for ai_messages.
-- A new specialized function is safer for ai_messages.

CREATE OR REPLACE FUNCTION increment_ai_message_usage(
  target_user_id UUID,
  tier TEXT,
  cost INT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF tier = 'tier1' THEN
    UPDATE usage_tracking 
    SET ai_messages_tier1_count = ai_messages_tier1_count + 1 
    WHERE user_id = target_user_id;
  ELSIF tier = 'tier2' THEN
    UPDATE usage_tracking 
    SET ai_messages_used = ai_messages_used + cost,
        ai_messages_tier2_count = ai_messages_tier2_count + 1 
    WHERE user_id = target_user_id;
  ELSIF tier = 'tier3' THEN
    UPDATE usage_tracking 
    SET ai_messages_used = ai_messages_used + cost,
        ai_messages_tier3_count = ai_messages_tier3_count + 1 
    WHERE user_id = target_user_id;
  END IF;
END;
$$;
