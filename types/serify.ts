export type ContentType = 'youtube' | 'article' | 'pdf' | 'text';

export interface ContentSource {
    id: string;
    type: ContentType;
    url?: string;
    content?: string;
    title: string;
    metadata?: any;
}

export interface Concept {
    id: string;
    name: string;
    description: string;
    importance: 'high' | 'medium' | 'low';
    relatedConcepts: string[];
    subConcepts?: {
        name: string;
        description: string;
    }[];
}

export interface CognitiveAnalysis {
    strengthMap: {
        strong: string[];
        weak: string[];
        missing: string[];
    };
    insights: {
        type: 'strength' | 'weakness' | 'misconception' | 'gap';
        message: string;
        relatedConcepts: string[];
    }[];
    focusSuggestions: string[];
}

export interface AssessmentQuestion {
    id: string;
    type: 'retrieval' | 'application' | 'misconception';
    text: string;
    options?: string[];
    correctAnswer?: string;
    relatedConcepts: string[];
}

export interface ReflectionSession {
    id: string;
    userId: string;
    date: Date;
    contentSource: ContentSource;
    extractedConcepts: Concept[];
    assessmentQuestions: AssessmentQuestion[];
    userAnswers: { questionId: string; answer: string }[];
    analysis?: CognitiveAnalysis;
    status: 'input' | 'processing' | 'assessment' | 'feedback';
}

export type MasteryState = 'mastered' | 'solid' | 'developing' | 'shaky' | 'revisit';

export interface MasteryHistoryEntry {
    date: Date | string;
    state: MasteryState;
    sourceType: 'session' | 'flashcards' | 'quiz' | 'feynman' | 'tutor' | 'explain' | 'deepdive' | 'practice_exam' | 'practice_scenario' | 'practice_review';
    sourceId: string;
}

export interface ConceptSynthesis {
    summary: string;
    persistentGap: string | null;
    improvement: string | null;
    generatedAt: Date | string;
    sessionCount: number;
}

export interface VaultCategory {
    id: string;
    user_id: string;
    name: string;
    display_order: number;
    created_at: Date | string;
    is_collapsed: boolean;
}

export interface StudySet {
    id: string;
    user_id: string;
    name: string;
    concept_ids: string[];
    created_at: Date | string;
    last_studied_at?: Date | string | null;
}

export interface KnowledgeNode {
    id: string;
    user_id: string;
    canonical_name: string;
    display_name: string;
    definition: string | null;
    category_id: string | null;
    parent_concept_id: string | null;
    is_sub_concept: boolean;
    is_archived: boolean;
    added_manually: boolean;
    current_mastery: MasteryState;
    mastery_history: MasteryHistoryEntry[];
    session_count: number;
    session_ids: string[];
    last_seen_at: Date | string;
    first_seen_at: Date | string;
    hint_request_count: number;
    skip_count: number;
    synthesis: ConceptSynthesis | null;
    synthesis_generated_at: Date | string | null;
    created_at: Date | string;
    updated_at: Date | string;
}

export type FlowStepType =
    | 'teach'
    | 'orient'
    | 'build_layer'
    | 'anchor'
    | 'check'
    | 'reinforce'
    | 'confirm'
    | 'completed';
export type FlowResponseType =
    | 'text_answer'
    | 'got_it'
    | 'still_shaky'
    | 'read_again'
    | 'i_know_this'
    | 'solid'
    | 'fuzzy'
    | 'needs_work'
    | 'quick_explanation';

export interface SessionLearnerProfile {
    estimatedLevel: 'beginner' | 'intermediate' | 'advanced';
    checkHistory: {
        conceptId: string;
        outcome: 'strong' | 'partial' | 'weak';
        pathTaken: 'A' | 'B' | 'C';
        timestamp: string;
    }[];
    anglesUsed: {
        conceptId: string;
        angle: string;
        timestamp: string;
    }[];
    reinforcementsRequired: number;
}

export interface FlowSession {
    id: string;
    user_id: string;
    source_type?: 'session' | 'vault' | 'standalone';
    source_session_id?: string;
    source_concept_id?: string;
    initial_plan: {
        concepts: {
            conceptId: string;
            conceptName: string;
            priority: number;
            estimatedSteps: number;
            suggestedOpeningMove: 'teach' | 'misconception_correction' | 'check_question';
            prerequisiteCheck: string | null;
            definition?: string;
            currentMastery?: MasteryState;
        }[];
        overallStrategy: string;
    };
    current_concept_id?: string;
    concepts_completed: string[];
    concepts_in_progress: string[];
    status: 'active' | 'paused' | 'completed' | 'abandoned';
    learner_profile?: SessionLearnerProfile;
    started_at: Date | string;
    last_activity_at: Date | string;
    completed_at?: Date | string;
    created_at: Date | string;
}

export interface FlowStep {
    id: string;
    flow_session_id: string;
    user_id: string;
    concept_id: string;
    step_number: number;
    step_type: FlowStepType;
    content: any;
    user_response?: string | null;
    response_type?: FlowResponseType | null;
    responded_at?: Date | string | null;
    evaluation?: {
        outcome?: string;
        feedbackText?: string;
        masterySignal?: string;
    } | null;
    ai_reasoning?: string | null;
    created_at: Date | string;
}

export interface FlowConceptProgress {
    id: string;
    flow_session_id: string;
    concept_id: string;
    user_id: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
    orchestrator_plan?: any;
    step_count: number;
    strong_signals: number;
    weak_signals: number;
    redirected_away: boolean;
    started_at: Date | string;
    completed_at?: Date | string;
    final_mastery_report?: string;
    self_reported_vs_actual?: 'aligned' | 'overconfident' | 'underconfident';
}

export interface CurriculumConcept {
    id: string;
    name: string;
    definition: string;
    difficulty: 'simple' | 'moderate' | 'complex';
    estimatedMinutes: number;
    isPrerequisite: boolean;
    prerequisiteFor: string[];
    alreadyInVault: boolean;
    vaultMasteryState: string | null;
    whyIncluded: string;
    misconceptionRisk: 'low' | 'medium' | 'high';
    orderIndex: number;
}

export interface CurriculumUnit {
    unitNumber: number;
    unitTitle: string;
    unitSummary: string;
    concepts: CurriculumConcept[];
}

export interface Curriculum {
    id: string;
    user_id: string;
    title: string;
    user_input: string;
    input_type: 'concept' | 'topic' | 'goal' | 'question';
    target_description: string;
    outcomes: string[];
    scope_note: string | null;
    units: CurriculumUnit[];
    concept_count: number;
    estimated_minutes: number;
    original_units: CurriculumUnit[];
    edit_count: number;
    status: 'active' | 'completed' | 'abandoned';
    recommended_start_index: number;
    current_concept_index: number;
    completed_concept_ids: string[];
    skipped_concept_ids: string[];
    started_at: Date | string;
    last_activity_at: Date | string;
    completed_at?: Date | string | null;
    created_at: Date | string;
}

export interface CurriculumConceptProgress {
    id: string;
    curriculum_id: string;
    user_id: string;
    concept_id: string;
    concept_name: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped' | 'needs_revisit';
    path_taken?: 'full' | 'accelerated_solid' | 'accelerated_developing';
    flow_session_id?: string;
    mastery_at_completion?: MasteryState;
    started_at: Date | string;
    completed_at?: Date | string | null;
}

export interface CurriculumFlowContext {
    curriculumId: string;
    curriculumTitle: string;
    allConcepts: CurriculumConcept[];
    currentConceptIndex: number;
    completedConceptIds: string[];
    userVaultContext: {
        strongConcepts: string[];
        weakConcepts: string[];
    };
    learnerProfile: SessionLearnerProfile;
}

export interface PracticeSession {
    id: string;
    user_id: string;
    tool: 'test' | 'quiz' | 'exam' | 'scenario' | 'flashcards' | 'review';
    topic: string | null;
    topic_normalized: string | null;
    source: 'free_text' | 'vault' | 'session';
    source_concept_ids: string[] | null;
    source_session_id: string | null;
    difficulty: 'auto' | 'easy' | 'medium' | 'hard';
    exam_format: string | null;
    time_limit_minutes: number | null;
    question_count: number | null;
    generated_content: any | null;
    status: 'in_progress' | 'completed' | 'timed_out' | 'abandoned';
    overall_performance: 'strong' | 'mixed' | 'developing' | 'weak' | null;
    results: any | null;
    tokens_consumed: number;
    started_at: string;
    completed_at: string | null;
    time_spent_seconds: number | null;
    concept_ids_updated: string[] | null;
}

export interface PracticeResponse {
    id: string;
    practice_session_id: string;
    user_id: string;
    question_id: string | null;
    question_text: string | null;
    target_concept: string | null;
    question_type: string | null;
    difficulty_level: number | null;
    user_response: string | null;
    response_quality: 'strong' | 'developing' | 'weak' | 'blank' | null;
    ai_feedback: string | null;
    evaluation_dimensions: any | null;
    question_number: number | null;
    time_spent_seconds: number | null;
    created_at: string;
}

export interface FlashcardSession {
    id: string;
    practice_session_id: string;
    user_id: string;
    cards: any;
    total_cards: number | null;
    cards_correct: number;
    cards_needs_review: number;
    completed_at: string | null;
    created_at: string;
}

export interface ReviewSchedule {
    id: string;
    user_id: string;
    concept_id: string;
    next_review_date: string;
    review_interval_days: number;
    consecutive_successful_reviews: number;
    total_reviews: number;
    last_reviewed_at: string | null;
    last_response_quality: string | null;
    is_mastered: boolean;
    mastered_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface PracticeExport {
    id: string;
    user_id: string;
    practice_session_id: string;
    export_type: string | null;
    file_url: string | null;
    created_at: string;
}

