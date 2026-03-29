
-- 1. Create exam_roadmaps table
CREATE TABLE IF NOT EXISTS public.exam_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  exam_type VARCHAR(50), -- 'standardized' | 'certification' | 'custom'
  exam_name VARCHAR(255),
  exam_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'completed' | 'abandoned'

  -- Schedule config
  study_days_per_week INTEGER DEFAULT 5,
  session_length_minutes INTEGER DEFAULT 60,
  preferred_time VARCHAR(20) DEFAULT 'afternoon', -- 'morning' | 'afternoon' | 'evening'
  buffer_days INTEGER DEFAULT 3,

  -- Progress
  total_topics INTEGER DEFAULT 0,
  completed_topics INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  sessions_missed INTEGER DEFAULT 0,
  total_study_minutes INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,

  -- Post-exam
  exam_outcome VARCHAR(20), -- 'passed' | 'okay' | 'failed' | null
  exam_notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create roadmap_topics table
CREATE TABLE IF NOT EXISTS public.roadmap_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES public.exam_roadmaps(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES public.knowledge_nodes(id),

  title VARCHAR(255) NOT NULL,
  unit VARCHAR(255),
  position INTEGER,
  weight FLOAT DEFAULT 1.0, -- higher weight = more sessions allocated
  is_stretch_goal BOOLEAN DEFAULT FALSE,

  status VARCHAR(20) DEFAULT 'not_started', -- 'not_started' | 'in_progress' | 'complete' | 'skipped'
  mastery_at_completion VARCHAR(20),
  sessions_allocated INTEGER DEFAULT 1,
  sessions_completed INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create roadmap_sessions table
CREATE TABLE IF NOT EXISTS public.roadmap_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roadmap_id UUID REFERENCES public.exam_roadmaps(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES public.roadmap_topics(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,

  session_type VARCHAR(20), -- 'main' | 'warmup' | 'followup' | 'review' | 'exam_day'
  scheduled_date DATE NOT NULL,
  scheduled_length_minutes INTEGER,

  status VARCHAR(20) DEFAULT 'scheduled', -- 'scheduled' | 'completed' | 'missed' | 'rescheduled'
  completed_at TIMESTAMP WITH TIME ZONE,
  actual_length_minutes INTEGER,

  reflection_session_id UUID REFERENCES public.reflection_sessions(id),
  mastery_after VARCHAR(20),
  rescheduled_from DATE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.exam_roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_sessions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
CREATE POLICY "Users can manage own roadmaps" ON public.exam_roadmaps
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own roadmap topics" ON public.roadmap_topics
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage own roadmap sessions" ON public.roadmap_sessions
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Migrate data from old roadmaps table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'roadmaps') THEN
        INSERT INTO public.exam_roadmaps (user_id, title, exam_date, status, created_at, updated_at)
        SELECT user_id, goal, target_date::DATE, status, created_at, updated_at FROM public.roadmaps;
    END IF;
END $$;
