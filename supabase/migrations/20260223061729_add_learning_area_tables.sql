-- Learning sessions (each mode launch is one)
CREATE TABLE IF NOT EXISTS public.learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    source_session_id UUID REFERENCES public.reflection_sessions(id) ON DELETE CASCADE NOT NULL,
    mode TEXT NOT NULL, -- flashcards, explain, feynman, tutor, quiz, deepdive
    started_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    concepts_targeted UUID[], -- concept ids
    outcome JSONB -- mode-specific results
);

-- Mastery updates from learning sessions
CREATE TABLE IF NOT EXISTS public.mastery_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE NOT NULL,
    source_type TEXT NOT NULL, -- 'session' or 'learning'
    source_id UUID,
    previous_mastery TEXT,
    new_mastery TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- AI Tutor conversation history
CREATE TABLE IF NOT EXISTS public.tutor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_session_id UUID REFERENCES public.learning_sessions(id) ON DELETE CASCADE NOT NULL,
    messages JSONB DEFAULT '[]'::jsonb, -- array of {role, content, timestamp}
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Flashcard decks
CREATE TABLE IF NOT EXISTS public.flashcard_decks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_session_id UUID REFERENCES public.learning_sessions(id) ON DELETE CASCADE NOT NULL,
    cards JSONB DEFAULT '[]'::jsonb, -- array of {front, back, conceptId, status}
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own learning sessions"
    ON public.learning_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own learning sessions"
    ON public.learning_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning sessions"
    ON public.learning_sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning sessions"
    ON public.learning_sessions FOR DELETE
    USING (auth.uid() = user_id);


CREATE POLICY "Users can insert their own mastery updates"
    ON public.mastery_updates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own mastery updates"
    ON public.mastery_updates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own mastery updates"
    ON public.mastery_updates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mastery updates"
    ON public.mastery_updates FOR DELETE
    USING (auth.uid() = user_id);


CREATE POLICY "Users can insert their own tutor conversations"
    ON public.tutor_conversations FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.learning_sessions ls
        WHERE ls.id = tutor_conversations.learning_session_id AND ls.user_id = auth.uid()
    ));

CREATE POLICY "Users can view their own tutor conversations"
    ON public.tutor_conversations FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.learning_sessions ls
        WHERE ls.id = tutor_conversations.learning_session_id AND ls.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own tutor conversations"
    ON public.tutor_conversations FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.learning_sessions ls
        WHERE ls.id = tutor_conversations.learning_session_id AND ls.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own tutor conversations"
    ON public.tutor_conversations FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.learning_sessions ls
        WHERE ls.id = tutor_conversations.learning_session_id AND ls.user_id = auth.uid()
    ));


CREATE POLICY "Users can insert their own flashcard decks"
    ON public.flashcard_decks FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.learning_sessions ls
        WHERE ls.id = flashcard_decks.learning_session_id AND ls.user_id = auth.uid()
    ));

CREATE POLICY "Users can view their own flashcard decks"
    ON public.flashcard_decks FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.learning_sessions ls
        WHERE ls.id = flashcard_decks.learning_session_id AND ls.user_id = auth.uid()
    ));

CREATE POLICY "Users can update their own flashcard decks"
    ON public.flashcard_decks FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.learning_sessions ls
        WHERE ls.id = flashcard_decks.learning_session_id AND ls.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete their own flashcard decks"
    ON public.flashcard_decks FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.learning_sessions ls
        WHERE ls.id = flashcard_decks.learning_session_id AND ls.user_id = auth.uid()
    ));
