-- Create user_feedback table
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- 'bug', 'suggestion', 'other'
    content TEXT NOT NULL,
    url TEXT,
    user_agent TEXT,
    screen_resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can insert their own feedback" 
ON public.user_feedback FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own feedback" 
ON public.user_feedback FOR SELECT 
USING (auth.uid() = user_id);

-- Only admins/service role should be able to view all feedback (handled by bypass)
