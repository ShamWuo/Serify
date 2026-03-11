-- Drop the old concept_topics table and its foreign keys
ALTER TABLE knowledge_nodes DROP CONSTRAINT IF EXISTS knowledge_nodes_topic_id_fkey;
DROP TABLE IF EXISTS concept_topics;

-- 1. Create vault_categories table
CREATE TABLE vault_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    is_collapsed BOOLEAN DEFAULT FALSE
);

-- RLS for vault_categories
ALTER TABLE vault_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own categories" ON vault_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own categories" ON vault_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON vault_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON vault_categories FOR DELETE USING (auth.uid() = user_id);

-- 2. Create study_sets table
CREATE TABLE study_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    concept_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    last_studied_at TIMESTAMP WITH TIME ZONE
);

-- RLS for study_sets
ALTER TABLE study_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own study sets" ON study_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own study sets" ON study_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own study sets" ON study_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own study sets" ON study_sets FOR DELETE USING (auth.uid() = user_id);

-- 3. Alter knowledge_nodes table
ALTER TABLE knowledge_nodes 
    DROP COLUMN IF EXISTS topic_id,
    DROP COLUMN IF EXISTS topic_name,
    ADD COLUMN category_id UUID REFERENCES vault_categories(id) ON DELETE SET NULL,
    ADD COLUMN parent_concept_id UUID REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
    ADD COLUMN is_sub_concept BOOLEAN DEFAULT FALSE,
    ADD COLUMN is_archived BOOLEAN DEFAULT FALSE,
    ADD COLUMN added_manually BOOLEAN DEFAULT FALSE;
