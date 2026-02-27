-- Drop old overlapping tables if they exist
DROP TABLE IF EXISTS public.flashcard_decks CASCADE;
DROP TABLE IF EXISTS public.tutor_conversations CASCADE;
DROP TABLE IF EXISTS public.mastery_updates CASCADE;
DROP TABLE IF EXISTS public.learning_sessions CASCADE;

-- Flashcard Decks
CREATE TABLE public.flashcard_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.reflection_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  regenerated_at TIMESTAMP WITH TIME ZONE,
  generation_count INTEGER DEFAULT 1,
  card_count INTEGER,
  cards JSONB NOT NULL,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(session_id)
);

-- Practice Quizzes
CREATE TABLE public.practice_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.reflection_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  regenerated_at TIMESTAMP WITH TIME ZONE,
  generation_count INTEGER DEFAULT 1,
  question_count INTEGER,
  questions JSONB NOT NULL,
  attempts JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(session_id)
);

-- Deep Dive Lessons
CREATE TABLE public.deep_dive_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.reflection_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE,
  target_concept_name TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  regenerated_at TIMESTAMP WITH TIME ZONE,
  generation_count INTEGER DEFAULT 1,
  content JSONB NOT NULL,
  confirmatory_question TEXT,
  confirmatory_answer TEXT,
  confirmatory_assessment TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(session_id)
);

-- Concept Explanations (Explain It To Me)
CREATE TABLE public.concept_explanations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.reflection_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE,
  concept_name TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  content TEXT NOT NULL,
  user_response TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  first_viewed_at TIMESTAMP WITH TIME ZONE,
  last_viewed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_concept_explanations_session ON public.concept_explanations(session_id);
CREATE INDEX idx_concept_explanations_concept ON public.concept_explanations(session_id, concept_id);

-- AI Tutor Conversations
CREATE TABLE public.tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.reflection_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  message_count INTEGER DEFAULT 0,
  spark_cost INTEGER DEFAULT 0,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  closing_analysis JSONB,
  UNIQUE(session_id)
);

-- Feynman Attempts
CREATE TABLE public.feynman_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.reflection_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE,
  target_concept_name TEXT,
  attempt_number INTEGER,
  user_explanation TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  feedback JSONB NOT NULL,
  spark_cost INTEGER DEFAULT 2
);

CREATE INDEX idx_feynman_attempts_session ON public.feynman_attempts(session_id);

-- Enable RLS
ALTER TABLE public.flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deep_dive_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concept_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feynman_attempts ENABLE ROW LEVEL SECURITY;

-- Flashcard Decks Policies
CREATE POLICY "Users can CRUD own flashcard decks" ON public.flashcard_decks 
FOR ALL USING (auth.uid() = user_id);

-- Practice Quizzes Policies
CREATE POLICY "Users can CRUD own practice quizzes" ON public.practice_quizzes 
FOR ALL USING (auth.uid() = user_id);

-- Deep Dive Lessons Policies
CREATE POLICY "Users can CRUD own deep dive lessons" ON public.deep_dive_lessons 
FOR ALL USING (auth.uid() = user_id);

-- Concept Explanations Policies
CREATE POLICY "Users can CRUD own concept explanations" ON public.concept_explanations 
FOR ALL USING (auth.uid() = user_id);

-- Tutor Conversations Policies
CREATE POLICY "Users can CRUD own tutor conversations" ON public.tutor_conversations 
FOR ALL USING (auth.uid() = user_id);

-- Feynman Attempts Policies
CREATE POLICY "Users can CRUD own feynman attempts" ON public.feynman_attempts 
FOR ALL USING (auth.uid() = user_id);
