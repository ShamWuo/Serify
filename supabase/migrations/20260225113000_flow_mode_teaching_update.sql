-- Add new JSONB columns for the Flow Mode teaching rewrite
ALTER TABLE flow_sessions ADD COLUMN learner_profile JSONB;
ALTER TABLE flow_concept_progress ADD COLUMN orchestrator_plan JSONB;
