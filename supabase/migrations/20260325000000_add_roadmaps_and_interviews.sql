-- Create roadmaps table
CREATE TABLE IF NOT EXISTS public.roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal TEXT NOT NULL,
    target_date TIMESTAMPTZ NOT NULL,
    curriculum_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

-- Policies for roadmaps
CREATE POLICY "Users can view their own roadmaps" ON public.roadmaps 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roadmaps" ON public.roadmaps 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmaps" ON public.roadmaps 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roadmaps" ON public.roadmaps 
FOR DELETE USING (auth.uid() = user_id);

-- Create interview_sessions table
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
    target_concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
    history JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for interview_sessions
CREATE POLICY "Users can view their own interview sessions" ON public.interview_sessions 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interview sessions" ON public.interview_sessions 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview sessions" ON public.interview_sessions 
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interview sessions" ON public.interview_sessions 
FOR DELETE USING (auth.uid() = user_id);
