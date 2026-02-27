-- Up Migration

-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  display_name TEXT,
  email TEXT UNIQUE NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  onboarding_completed BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- 'youtube', 'article', 'pdf', 'notes'
  content_url TEXT,
  content_title TEXT,
  raw_text TEXT,
  concept_map JSONB,
  method TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'processing', -- 'processing', 'active', 'analyzing', 'complete', 'abandoned'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- CONCEPTS TABLE
CREATE TABLE IF NOT EXISTS public.concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  definition TEXT,
  importance TEXT,
  misconception_risk BOOLEAN DEFAULT false,
  relationships JSONB DEFAULT '[]'::jsonb
);

-- QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  target_concept_id UUID REFERENCES public.concepts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'RETRIEVAL', 'APPLICATION', 'MISCONCEPTION PROBE'
  question_text TEXT NOT NULL,
  order_index INTEGER NOT NULL
);

-- ANSWERS TABLE
CREATE TABLE IF NOT EXISTS public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  assessment JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FEEDBACK REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID UNIQUE REFERENCES public.sessions(id) ON DELETE CASCADE,
  summary_sentence TEXT,
  strength_map JSONB,
  cognitive_analysis JSONB,
  misconception_report JSONB,
  focus_suggestions JSONB,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KNOWLEDGE NODES TABLE (Persistent Knowledge Graph)
CREATE TABLE IF NOT EXISTS public.knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  concept_name TEXT NOT NULL,
  canonical_name TEXT,
  session_ids UUID[] DEFAULT '{}',
  mastery_history JSONB DEFAULT '[]'::jsonb,
  current_mastery TEXT, -- 'Strongly Retained', 'Shallow', 'Missing', 'Misconception'
  UNIQUE(user_id, canonical_name)
);

-- Row Level Security (RLS) Policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_nodes ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Sessions
CREATE POLICY "Users can CRUD own sessions" ON public.sessions FOR ALL USING (auth.uid() = user_id);

-- Answers
CREATE POLICY "Users can CRUD own answers" ON public.answers FOR ALL USING (auth.uid() = user_id);

-- Knowledge Nodes
CREATE POLICY "Users can CRUD own knowledge nodes" ON public.knowledge_nodes FOR ALL USING (auth.uid() = user_id);

-- Trigger to create a user record when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, subscription_tier, onboarding_completed)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'display_name', 'User'), 'free', false);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
