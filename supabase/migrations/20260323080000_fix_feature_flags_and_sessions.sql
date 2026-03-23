-- Fix permissions for feature_flags table to resolve 404 errors
GRANT SELECT ON public.feature_flags TO anon, authenticated;

-- Add missing content_source column to reflection_sessions to fix 400 errors
ALTER TABLE public.reflection_sessions ADD COLUMN IF NOT EXISTS content_source jsonb DEFAULT '{}'::jsonb;

-- Ensure RLS is enabled and select is allowed for users on their own sessions
-- (This should already be there, but adding as a safety measure for the content_source access)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'reflection_sessions' AND policyname = 'Users can view own sessions'
    ) THEN
        CREATE POLICY "Users can view own sessions" ON public.reflection_sessions
        FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Fix for Learn Mode: The codebase expects 'curricula' table.
-- Ensure it has necessary permissions.
GRANT ALL ON public.curricula TO authenticated;
GRANT ALL ON public.curriculum_concept_progress TO authenticated;
