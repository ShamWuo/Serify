import { supabase } from './supabase';

const PLAN_FEATURES: Record<string, any> = {
    free: {
        sessionsPerMonth: 3,
        sessionHistory: 7,
        learningModes: ['flashcards', 'explain'],
        feedbackSections: ['strength_map'],
        methods: ['standard'],
        knowledgeVault: false,
        sharing: false,
        weeklyDigest: false,
        batchPdfUpload: false,
        aiTutor: false,
    },
    pro: {
        sessionsPerMonth: Infinity,
        sessionHistory: Infinity,
        learningModes: ['flashcards', 'explain', 'feynman', 'tutor', 'quiz', 'deepdive'],
        feedbackSections: ['strength_map', 'cognitive_analysis', 'misconceptions', 'focus_suggestions'],
        methods: ['standard', 'feynman', 'spaced_repetition', 'socratic', 'practice'],
        knowledgeVault: true,
        sharing: true,
        weeklyDigest: true,
        batchPdfUpload: true,
        aiTutor: true,
    },
    teams: {
        sessionsPerMonth: Infinity,
        sessionHistory: Infinity,
        learningModes: ['flashcards', 'explain', 'feynman', 'tutor', 'quiz', 'deepdive'],
        feedbackSections: ['strength_map', 'cognitive_analysis', 'misconceptions', 'focus_suggestions'],
        methods: ['standard', 'feynman', 'spaced_repetition', 'socratic', 'practice'],
        knowledgeVault: true,
        sharing: true,
        weeklyDigest: true,
        batchPdfUpload: true,
        aiTutor: true,

        teamWorkspace: true,
        adminDashboard: true,
        contentAssignment: true,
        teamAnalytics: true,
    }
};

export async function canAccess(userId: string, featureGroupName: string, featureValue?: string): Promise<boolean> {
    const { data: user } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

    const plan = user?.subscription_tier || 'free';
    const planFeatures = PLAN_FEATURES[plan];

    if (!planFeatures) return false;

    const feature = planFeatures[featureGroupName];

    if (Array.isArray(feature) && featureValue) {
        return feature.includes(featureValue);
    }

    return !!feature;
}

export function getPlanFeatures(plan: string) {
    return PLAN_FEATURES[plan] || PLAN_FEATURES['free'];
}
