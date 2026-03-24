-- Fix Flow Session source flexibility
-- Drop the strict session FK to allow curricula, topics, etc.
ALTER TABLE public.flow_sessions DROP CONSTRAINT IF EXISTS flow_sessions_source_session_id_fkey;

-- Add curriculum_id if missing (for clearer association than generic source_session_id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'flow_sessions' AND column_name = 'curriculum_id') THEN
        ALTER TABLE public.flow_sessions ADD COLUMN curriculum_id UUID REFERENCES public.curricula(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add generic source_topic column
ALTER TABLE public.flow_sessions ADD COLUMN IF NOT EXISTS source_topic TEXT;

-- Ensure RLS includes the new columns if necessary (though users can already manage their own)
-- No changes needed to policies if they are based on user_id.

-- Fix permissions for the flow tables (safety measure)
GRANT ALL ON public.flow_sessions TO authenticated;
GRANT ALL ON public.flow_steps TO authenticated;
GRANT ALL ON public.flow_concept_progress TO authenticated;
