-- Up Migration

-- Curricula
CREATE TABLE IF NOT EXISTS public.curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Identity
  title VARCHAR(255) NOT NULL,
  user_input TEXT NOT NULL,
  input_type VARCHAR(20),
  target_description TEXT,
  outcomes JSONB,
  scope_note TEXT,
  
  -- Content
  units JSONB NOT NULL,
  concept_count INTEGER,
  estimated_minutes INTEGER,
  
  -- Version tracking
  original_units JSONB NOT NULL,
  edit_count INTEGER DEFAULT 0,
  
  -- Progress
  status VARCHAR(20) DEFAULT 'active',
  recommended_start_index INTEGER DEFAULT 0,
  current_concept_index INTEGER DEFAULT 0,
  completed_concept_ids UUID[] DEFAULT '{}',
  skipped_concept_ids UUID[] DEFAULT '{}',
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_sparks_spent INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Per-concept progress within a curriculum
CREATE TABLE IF NOT EXISTS public.curriculum_concept_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID REFERENCES public.curricula(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  concept_id UUID,
  concept_name VARCHAR(255),
  
  status VARCHAR(20) DEFAULT 'not_started',
  
  path_taken VARCHAR(40),
  
  flow_session_id UUID REFERENCES public.flow_sessions(id) ON DELETE SET NULL,
  
  mastery_at_completion VARCHAR(20),
  sparks_spent INTEGER DEFAULT 0,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_curricula_user ON public.curricula(user_id);
CREATE INDEX IF NOT EXISTS idx_curricula_status ON public.curricula(user_id, status);
CREATE INDEX IF NOT EXISTS idx_curriculum_concept_progress_curriculum ON public.curriculum_concept_progress(curriculum_id);

-- Add RLS
ALTER TABLE public.curricula ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own curricula"
  ON public.curricula FOR ALL USING (auth.uid() = user_id);

ALTER TABLE public.curriculum_concept_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own curriculum progress"
  ON public.curriculum_concept_progress FOR ALL USING (auth.uid() = user_id);
