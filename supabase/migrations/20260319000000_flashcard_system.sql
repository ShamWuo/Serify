-- Flashcard System Migration Phase 1

-- Flashcard decks
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Source
    source_type VARCHAR(20), -- 'session' | 'topic' | 'vault' | 'manual' | 'shared'
    source_session_id UUID REFERENCES public.reflection_sessions(id) ON DELETE SET NULL,
    source_topic VARCHAR(255),
    source_concept_ids UUID[],

    -- Stats
    total_cards INTEGER DEFAULT 0,
    cards_know_it INTEGER DEFAULT 0,
    cards_still_learning INTEGER DEFAULT 0,
    cards_not_studied INTEGER DEFAULT 0,

    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(50) UNIQUE DEFAULT encode(gen_random_bytes(20), 'hex'),
    shared_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Settings (last used per deck)
    last_settings JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_studied_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual cards
CREATE TABLE IF NOT EXISTS public.flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    front TEXT NOT NULL,
    back TEXT NOT NULL,
    concept_tag VARCHAR(255),
    concept_id UUID REFERENCES public.knowledge_nodes(id) ON DELETE SET NULL,
    card_type VARCHAR(20), -- 'definition' | 'mechanism' | 'example' | 'distinction'

    -- Star
    is_starred BOOLEAN DEFAULT FALSE,

    -- Progress
    progress_state VARCHAR(20) DEFAULT 'not_studied', -- 'not_studied' | 'still_learning' | 'know_it'

    -- Stats
    times_seen INTEGER DEFAULT 0,
    times_correct INTEGER DEFAULT 0,
    times_incorrect INTEGER DEFAULT 0,
    last_seen_at TIMESTAMPTZ,

    -- Edit tracking
    original_front TEXT,
    original_back TEXT,
    is_edited BOOLEAN DEFAULT FALSE,
    is_ai_generated BOOLEAN DEFAULT TRUE,

    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Study sessions
CREATE TABLE IF NOT EXISTS public.flashcard_study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Settings used
    mode VARCHAR(20), -- 'flip' | 'learn' | 'write' | 'rapid_fire'
    cards_studied UUID[],
    settings_used JSONB,

    -- Results
    cards_seen INTEGER DEFAULT 0,
    cards_know_it INTEGER DEFAULT 0,
    cards_still_learning INTEGER DEFAULT 0,
    completion_percentage INTEGER DEFAULT 0,

    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER
);

-- Challenge records
CREATE TABLE IF NOT EXISTS public.flashcard_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_id UUID REFERENCES public.flashcard_decks(id) ON DELETE CASCADE,
    challenger_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    challenger_score INTEGER,
    challenger_total INTEGER,
    challenge_token VARCHAR(50) UNIQUE DEFAULT encode(gen_random_bytes(20), 'hex'),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Challenge attempts
CREATE TABLE IF NOT EXISTS public.flashcard_challenge_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    challenge_id UUID REFERENCES public.flashcard_challenges(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    display_name VARCHAR(100),
    score INTEGER,
    total INTEGER,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_challenge_attempts ENABLE ROW LEVEL SECURITY;

-- Polices for flashcard_decks
CREATE POLICY "Users can manage their own decks" ON public.flashcard_decks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view public decks" ON public.flashcard_decks
    FOR SELECT USING (is_public = TRUE);

CREATE POLICY "Anyone with share token can view deck" ON public.flashcard_decks
    FOR SELECT USING (share_token IS NOT NULL);

-- Policies for flashcards
CREATE POLICY "Users can manage their own cards" ON public.flashcards
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view cards in viewable decks" ON public.flashcards
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.flashcard_decks 
            WHERE id = deck_id AND (is_public = TRUE OR share_token IS NOT NULL OR auth.uid() = user_id)
        )
    );

-- Policies for study sessions
CREATE POLICY "Users can manage their own study sessions" ON public.flashcard_study_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Policies for challenges
CREATE POLICY "Users can manage their own challenges" ON public.flashcard_challenges
    FOR ALL USING (auth.uid() = challenger_user_id);

CREATE POLICY "Challenge access via token" ON public.flashcard_challenges
    FOR SELECT USING (challenge_token IS NOT NULL);

-- Policies for challenge attempts
CREATE POLICY "Users can manage their own attempts" ON public.flashcard_challenge_attempts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public challenge attempts" ON public.flashcard_challenge_attempts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.flashcard_challenges WHERE id = challenge_id
        )
    );
