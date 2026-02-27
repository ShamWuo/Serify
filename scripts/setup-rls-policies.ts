export const setupRLSPolicies = `
ALTER TABLE IF EXISTS public.reflection_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.assessment_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own sessions" ON public.reflection_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.reflection_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.reflection_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.reflection_sessions;

CREATE POLICY "Users can view own sessions"
    ON public.reflection_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions"
    ON public.reflection_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON public.reflection_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON public.reflection_sessions
    FOR DELETE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view concepts from own sessions" ON public.concepts;
DROP POLICY IF EXISTS "Users can insert concepts to own sessions" ON public.concepts;
DROP POLICY IF EXISTS "Users can update concepts in own sessions" ON public.concepts;

CREATE POLICY "Users can view concepts from own sessions"
    ON public.concepts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = concepts.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert concepts to own sessions"
    ON public.concepts
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = concepts.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update concepts in own sessions"
    ON public.concepts
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = concepts.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view questions from own sessions" ON public.assessment_questions;
DROP POLICY IF EXISTS "Users can insert questions to own sessions" ON public.assessment_questions;
DROP POLICY IF EXISTS "Users can update questions in own sessions" ON public.assessment_questions;

CREATE POLICY "Users can view questions from their own sessions"
    ON public.assessment_questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = assessment_questions.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert questions to their own sessions"
    ON public.assessment_questions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = assessment_questions.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update questions in their own sessions"
    ON public.assessment_questions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = assessment_questions.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view own answers" ON public.user_answers;
DROP POLICY IF EXISTS "Users can insert own answers" ON public.user_answers;
DROP POLICY IF EXISTS "Users can update own answers" ON public.user_answers;
DROP POLICY IF EXISTS "Users can delete own answers" ON public.user_answers;

CREATE POLICY "Users can view own answers"
    ON public.user_answers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = user_answers.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own answers"
    ON public.user_answers
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = user_answers.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own answers"
    ON public.user_answers
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = user_answers.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own answers"
    ON public.user_answers
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = user_answers.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can view own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON public.analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON public.analyses;

CREATE POLICY "Users can view own analyses"
    ON public.analyses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = analyses.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own analyses"
    ON public.analyses
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = analyses.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own analyses"
    ON public.analyses
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.reflection_sessions
            WHERE reflection_sessions.id = analyses.session_id
            AND reflection_sessions.user_id = auth.uid()
        )
    );

`;
