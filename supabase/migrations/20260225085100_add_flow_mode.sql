-- Flow Mode sessions
CREATE TABLE flow_sessions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  
  -- Origin context
  source_type VARCHAR(20), -- 'session' | 'vault' | 'standalone'
  source_session_id UUID REFERENCES sessions(id), -- null if standalone
  source_concept_id UUID REFERENCES knowledge_nodes(id), -- null if from session
  
  -- Plan
  initial_plan JSONB NOT NULL,
  -- { concepts: [...], overallStrategy: string }
  
  current_concept_id UUID REFERENCES knowledge_nodes(id),
  concepts_completed UUID[], -- concept IDs that reached mastery_confirm "got it"
  concepts_in_progress UUID[], -- started but not completed
  
  -- State
  status VARCHAR(20) DEFAULT 'active',
  -- 'active' | 'paused' | 'completed' | 'abandoned'
  
  -- Costs
  total_sparks_spent INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMP DEFAULT now(),
  last_activity_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT now()
);

-- Individual steps within a flow session
CREATE TABLE flow_steps (
  id UUID PRIMARY KEY,
  flow_session_id UUID REFERENCES flow_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  concept_id UUID REFERENCES knowledge_nodes(id),
  
  -- Step identity
  step_number INTEGER NOT NULL, -- sequential within the session
  step_type VARCHAR(30) NOT NULL,
  -- 'teach' | 'check_question' | 'flashcard' | 'feynman' | 
  -- 'misconception_correction' | 'concept_bridge' | 'mastery_confirm'
  
  -- Content
  content JSONB NOT NULL,
  
  -- User response
  user_response TEXT, -- null until user responds
  response_type VARCHAR(20),
  -- 'text_answer' | 'got_it' | 'still_shaky' | 'read_again' |
  -- 'i_know_this' | 'solid' | 'fuzzy' | 'needs_work'
  responded_at TIMESTAMP,
  
  -- AI evaluation (for steps that have it)
  evaluation JSONB,
  -- { outcome: string, feedbackText: string, masterySignal: string }
  
  -- Routing
  ai_reasoning TEXT, -- internal note on why this step was chosen
  spark_cost INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_flow_steps_session ON flow_steps(flow_session_id);
CREATE INDEX idx_flow_steps_concept ON flow_steps(flow_session_id, concept_id);

-- Concept-level progress within a flow session
CREATE TABLE flow_concept_progress (
  id UUID PRIMARY KEY,
  flow_session_id UUID REFERENCES flow_sessions(id) ON DELETE CASCADE,
  concept_id UUID REFERENCES knowledge_nodes(id),
  user_id UUID REFERENCES users(id),
  
  status VARCHAR(20) DEFAULT 'not_started',
  -- 'not_started' | 'in_progress' | 'completed' | 'skipped'
  
  step_count INTEGER DEFAULT 0,
  strong_signals INTEGER DEFAULT 0,
  weak_signals INTEGER DEFAULT 0,
  redirected_away BOOLEAN DEFAULT FALSE,
  
  started_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  
  final_mastery_report VARCHAR(20),
  -- what mastery_confirm returned: 'got_it' | 'fuzzy' | 'needs_work'
  
  self_reported_vs_actual VARCHAR(20)
  -- 'aligned' | 'overconfident' | 'underconfident'
  -- set when mastery_confirm response doesn't match actual performance
);

-- Enable RLS
ALTER TABLE flow_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_concept_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own flow sessions"
ON flow_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own flow steps"
ON flow_steps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own flow concept progress"
ON flow_concept_progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
