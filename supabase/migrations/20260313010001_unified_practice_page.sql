-- Migration: Unified Practice Page Schema

-- Clean up older fragmented practice tables cleanly to replace with new unified scheme
DROP TABLE IF EXISTS public.practice_exports CASCADE;
DROP TABLE IF EXISTS public.vault_regressions CASCADE;
DROP TABLE IF EXISTS public.practice_responses CASCADE;
DROP TABLE IF EXISTS public.flashcard_sessions CASCADE;
DROP TABLE IF EXISTS public.review_schedule CASCADE;
DROP TABLE IF EXISTS public.practice_sessions CASCADE;

-- 1. Unified practice sessions table
CREATE TABLE public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,

  tool VARCHAR(20) NOT NULL,
  -- 'test' | 'quiz' | 'exam' | 'scenario' | 'flashcards' | 'review'

  -- Input
  topic VARCHAR(255),
  topic_normalized VARCHAR(255),
  source VARCHAR(20) DEFAULT 'free_text',
  -- 'free_text' | 'vault' | 'session'
  source_concept_ids UUID[],
  source_session_id UUID REFERENCES public.reflection_sessions(id),

  -- Config
  difficulty VARCHAR(10) DEFAULT 'auto',
  -- 'auto' | 'easy' | 'medium' | 'hard'
  exam_format VARCHAR(20),
  time_limit_minutes INTEGER,
  question_count INTEGER,

  -- Content
  generated_content JSONB,

  -- Results
  status VARCHAR(20) DEFAULT 'in_progress',
  -- 'in_progress' | 'completed' | 'timed_out' | 'abandoned'
  overall_performance VARCHAR(20),
  -- 'strong' | 'mixed' | 'developing' | 'weak'
  results JSONB,

  -- Tokens
  tokens_consumed INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent_seconds INTEGER,

  -- Vault
  concept_ids_updated UUID[]
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own practice sessions"
  ON public.practice_sessions FOR ALL
  USING (auth.uid() = user_id);

-- 2. Individual responses (questions and scenario)
CREATE TABLE public.practice_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_session_id UUID REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,

  question_id VARCHAR(50),
  question_text TEXT,
  target_concept VARCHAR(255),
  question_type VARCHAR(20),
  difficulty_level INTEGER,

  user_response TEXT,
  response_quality VARCHAR(20),
  -- 'strong' | 'developing' | 'weak' | 'blank'
  ai_feedback TEXT,
  evaluation_dimensions JSONB,

  question_number INTEGER,
  time_spent_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.practice_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own practice responses"
  ON public.practice_responses FOR ALL
  USING (auth.uid() = user_id);

-- 3. Flashcard sessions
CREATE TABLE public.flashcard_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_session_id UUID REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,

  cards JSONB NOT NULL,
  total_cards INTEGER,
  cards_correct INTEGER DEFAULT 0,
  cards_needs_review INTEGER DEFAULT 0,

  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.flashcard_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own flashcard sessions"
  ON public.flashcard_sessions FOR ALL
  USING (auth.uid() = user_id);

-- 4. Spaced review schedule
CREATE TABLE public.review_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  concept_id UUID REFERENCES public.knowledge_nodes(id) NOT NULL,

  next_review_date DATE NOT NULL,
  review_interval_days INTEGER NOT NULL,
  consecutive_successful_reviews INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,

  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  last_response_quality VARCHAR(20),

  is_mastered BOOLEAN DEFAULT FALSE,
  mastered_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),

  UNIQUE(user_id, concept_id)
);

ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own review schedule"
  ON public.review_schedule FOR ALL
  USING (auth.uid() = user_id);

-- 5. PDF exports
CREATE TABLE public.practice_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  practice_session_id UUID REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  
  export_type VARCHAR(20),
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.practice_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own practice exports"
  ON public.practice_exports FOR ALL
  USING (auth.uid() = user_id);
