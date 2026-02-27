-- Quick Fix: RLS Policies for reflection_sessions
-- Run this in Supabase SQL Editor to fix the immediate error

-- Enable RLS (if not already enabled)
ALTER TABLE public.reflection_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own sessions" ON public.reflection_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.reflection_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.reflection_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.reflection_sessions;

-- Create insert policy (this fixes the immediate error)
CREATE POLICY "Users can insert own sessions"
    ON public.reflection_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create select policy (so users can view their sessions)
CREATE POLICY "Users can view own sessions"
    ON public.reflection_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Create update policy (so users can update their sessions)
CREATE POLICY "Users can update own sessions"
    ON public.reflection_sessions
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Create delete policy (so users can delete their sessions)
CREATE POLICY "Users can delete own sessions"
    ON public.reflection_sessions
    FOR DELETE
    USING (auth.uid() = user_id);
