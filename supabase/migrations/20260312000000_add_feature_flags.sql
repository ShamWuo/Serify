-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create feature_flags table
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    rules JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read enabled flags (or all flags if they have the right key)
-- For now, allow reading all flags to keep it simple for the implementation
CREATE POLICY "Allow public read-only access to feature flags"
ON feature_flags FOR SELECT
TO authenticated, anon
USING (TRUE);

-- Only allow service role to manage flags (or we could add admin checks)
CREATE POLICY "Allow service role to manage feature flags"
ON feature_flags FOR ALL
TO service_role
USING (TRUE);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_feature_flags_updated_at
BEFORE UPDATE ON feature_flags
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Seed some initial flags
INSERT INTO feature_flags (key, description, is_enabled, rollout_percentage)
VALUES 
    ('new_dashboard_v2', 'New experimental dashboard layout', FALSE, 0),
    ('ai_voice_synthesis', 'AI voice synthesis for learning materials', FALSE, 10),
    ('experimental_flow_mode', 'Advanced flow mode features', TRUE, 100)
ON CONFLICT (key) DO NOTHING;
