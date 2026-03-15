-- Migration: Add Practice Mode schema

-- Practice sessions
CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  type VARCHAR(20) NOT NULL,
  -- 'exam' | 'scenario' | 'review' | 'print'
  
  -- Scope
  concept_ids UUID[],
  category_id UUID,
  source_session_id UUID REFERENCES public.reflection_sessions(id),
  
  -- Exam config
  format VARCHAR(20),
  -- 'standard' | 'problem_set' | 'essay' | 'case_study' | 'technical'
  time_limit_minutes INTEGER,
  question_count INTEGER,
  
  -- Results
  status VARCHAR(20) DEFAULT 'in_progress',
  -- 'in_progress' | 'completed' | 'timed_out' | 'abandoned'
  overall_performance VARCHAR(20),
  -- 'strong' | 'developing' | 'shaky'
  performance_report JSONB,
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own practice sessions"
  ON public.practice_sessions
  FOR ALL
  USING (auth.uid() = user_id);

-- Individual question responses
CREATE TABLE IF NOT EXISTS public.practice_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_session_id UUID REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  concept_id UUID REFERENCES public.knowledge_nodes(id),
  
  question_text TEXT NOT NULL,
  question_type VARCHAR(20),
  -- 'explain' | 'apply' | 'synthesize' | 'edge_case' | 'scenario'
  difficulty_level INTEGER, -- 1-5
  
  user_response TEXT,
  response_quality VARCHAR(20),
  -- 'strong' | 'developing' | 'weak' | 'blank'
  ai_feedback TEXT,
  
  time_spent_seconds INTEGER,
  question_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.practice_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own practice responses"
  ON public.practice_responses
  FOR ALL
  USING (auth.uid() = user_id);

-- Spaced repetition schedule
CREATE TABLE IF NOT EXISTS public.review_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  concept_id UUID REFERENCES public.knowledge_nodes(id) NOT NULL,
  
  next_review_date DATE NOT NULL,
  review_interval_days INTEGER NOT NULL,
  consecutive_successful_reviews INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  last_response_quality VARCHAR(20),
  
  -- Mastered flag
  mastered_at TIMESTAMP WITH TIME ZONE,
  is_mastered BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  UNIQUE(user_id, concept_id)
);

ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own review schedule"
  ON public.review_schedule
  FOR ALL
  USING (auth.uid() = user_id);

-- PDF exports
CREATE TABLE IF NOT EXISTS public.practice_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  practice_session_id UUID REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  export_type VARCHAR(20),
  -- 'questions_only' | 'with_answers' | 'answer_key'
  answer_space VARCHAR(20),
  -- 'standard' | 'extended' | 'minimal'
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.practice_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own practice exports"
  ON public.practice_exports
  FOR ALL
  USING (auth.uid() = user_id);

-- Vault regression tracking
CREATE TABLE IF NOT EXISTS public.vault_regressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  concept_id UUID REFERENCES public.knowledge_nodes(id) NOT NULL,
  practice_session_id UUID REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  previous_state VARCHAR(20),
  new_state VARCHAR(20),
  regression_note TEXT,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.vault_regressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vault regressions"
  ON public.vault_regressions
  FOR ALL
  USING (auth.uid() = user_id);
