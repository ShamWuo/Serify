-- Drop Spark tables if they exist
DROP TABLE IF EXISTS spark_transactions CASCADE;
DROP TABLE IF EXISTS spark_grants CASCADE;
DROP TABLE IF EXISTS spark_pools CASCADE;
DROP TABLE IF EXISTS spark_balances CASCADE;

-- Tracks usage per user per billing period
CREATE TABLE usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  -- 'free' | 'pro' | 'proplus'
  
  -- Billing period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 month',
  
  -- Usage counters (reset each period)
  sessions_used INTEGER DEFAULT 0,
  flashcards_used INTEGER DEFAULT 0,
  quizzes_used INTEGER DEFAULT 0,
  ai_messages_used INTEGER DEFAULT 0,
  flow_sessions_used INTEGER DEFAULT 0,
  curricula_used INTEGER DEFAULT 0,
  deep_dives_used INTEGER DEFAULT 0,
  
  -- Vault concept count (not period-based, running total)
  vault_concept_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plan limits reference table
CREATE TABLE plan_limits (
  plan VARCHAR(20) PRIMARY KEY,
  sessions_limit INTEGER, -- NULL = unlimited
  flashcards_limit INTEGER,
  quizzes_limit INTEGER,
  ai_messages_limit INTEGER,
  flow_sessions_limit INTEGER,
  curricula_limit INTEGER,
  deep_dives_limit INTEGER,
  vault_concepts_limit INTEGER
);

-- Seed plan limits
INSERT INTO plan_limits 
(plan, sessions_limit, flashcards_limit, quizzes_limit, ai_messages_limit, flow_sessions_limit, curricula_limit, deep_dives_limit, vault_concepts_limit) 
VALUES
  ('free',    3,    5,    3,   10,  1,  1,  2,   10),
  ('pro',    20,   50,   30,  150, 10,  5, 20,  200),
  ('proplus', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL);

-- Subscription record
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(20) NOT NULL DEFAULT 'free',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  -- 'active' | 'cancelled' | 'past_due' | 'paused'
  
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),
  
  billing_interval VARCHAR(10),
  -- 'month' | 'year' | null (free)
  
  pending_plan VARCHAR(20),
  
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

-- Processed webhooks table for idempotency
CREATE TABLE processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_usage_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_usage_tracking_updated_at
BEFORE UPDATE ON usage_tracking
FOR EACH ROW
EXECUTE FUNCTION update_usage_tracking_updated_at();

CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();

-- Policies on usage_tracking (service role handles most updates, user can read their own)
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own usage tracking" 
ON usage_tracking FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policies on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own subscriptions" 
ON subscriptions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policies on plan_limits (public read)
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plan limits are viewable by everyone" 
ON plan_limits FOR SELECT 
USING (true);

-- Ensure usage_tracking is created for new users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  
  INSERT INTO public.usage_tracking (user_id)
  VALUES (new.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
