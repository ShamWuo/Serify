-- Migration to fix schema inconsistencies between code and database

-- 1. Rename 'sessions' to 'reflection_sessions' if it exists.
-- Also ensure sessions referenced by learning_sessions/flashcard_decks keep their associations.
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sessions') THEN
        -- Check if reflection_sessions exists, if so, we might need to merge or just drop sessions if it's empty
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reflection_sessions') THEN
            -- Both exist. We should probably merge data or just drop sessions if reflection_sessions is the primary.
            -- In this case, we'll assume reflection_sessions is the one to keep.
            RAISE NOTICE 'Both sessions and reflection_sessions exist. Keeping reflection_sessions.';
        ELSE
            ALTER TABLE public.sessions RENAME TO reflection_sessions;
            RAISE NOTICE 'Renamed sessions to reflection_sessions.';
        END IF;
    END IF;
END $$;

-- 2. Add missing columns to knowledge_nodes
ALTER TABLE public.knowledge_nodes 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS definition TEXT,
ADD COLUMN IF NOT EXISTS topic_id UUID,
ADD COLUMN IF NOT EXISTS topic_name TEXT,
ADD COLUMN IF NOT EXISTS session_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS hint_request_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS skip_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS synthesis JSONB,
ADD COLUMN IF NOT EXISTS synthesis_generated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill display_name if null
UPDATE public.knowledge_nodes 
SET display_name = concept_name 
WHERE display_name IS NULL AND concept_name IS NOT NULL;

-- 3. Create concept_topics table if it's referenced in the code but missing
CREATE TABLE IF NOT EXISTS public.concept_topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    concept_count INTEGER DEFAULT 0,
    dominant_mastery TEXT,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 4. Ensure curricula has correct tracking columns
ALTER TABLE public.curricula 
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Enable RLS on new tables if any
ALTER TABLE public.concept_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own concept topics" ON public.concept_topics;
CREATE POLICY "Users can manage their own concept topics" ON public.concept_topics FOR ALL USING (auth.uid() = user_id);

-- Ensure RLS on reflection_sessions (just in case they were renamed)
ALTER TABLE public.reflection_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can CRUD own sessions" ON public.reflection_sessions;
CREATE POLICY "Users can CRUD own sessions" ON public.reflection_sessions 
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
