-- Performance Optimization: Missing Indexes for frequently queried tables
-- Path: supabase/migrations/20260328020000_add_performance_indexes.sql

-- 1. Roadmap System Indexes
CREATE INDEX IF NOT EXISTS idx_exam_roadmaps_user_id ON public.exam_roadmaps(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_topics_roadmap_id ON public.roadmap_topics(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_topics_user_id ON public.roadmap_topics(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_sessions_roadmap_id ON public.roadmap_sessions(roadmap_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_sessions_user_id ON public.roadmap_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_sessions_topic_id ON public.roadmap_sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_roadmap_sessions_scheduled_date ON public.roadmap_sessions(scheduled_date);

-- 2. Flow Mode Indexes
CREATE INDEX IF NOT EXISTS idx_flow_sessions_user_id ON public.flow_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_created_at ON public.flow_sessions(created_at DESC);

-- 3. Curricula Indexes
-- idx_curricula_user already exists in some environments but let's be sure
CREATE INDEX IF NOT EXISTS idx_curricula_user_id ON public.curricula(user_id);
CREATE INDEX IF NOT EXISTS idx_curricula_last_activity ON public.curricula(last_activity_at DESC);

-- 4. Knowledge Nodes / Vault
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_user_id ON public.knowledge_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_mastery ON public.knowledge_nodes(user_id, current_mastery);

-- 5. Usage Tracking
CREATE INDEX IF NOT EXISTS idx_usage_tracking_user_id ON public.usage_tracking(user_id);
