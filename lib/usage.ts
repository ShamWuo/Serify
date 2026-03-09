import { NextApiRequest } from 'next';
import { supabase } from './supabase';

export async function authenticateApiRequest(req: NextApiRequest): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
}

export type FeatureName =
    | 'sessions'
    | 'flashcards'
    | 'quizzes'
    | 'ai_messages'
    | 'flow_sessions'
    | 'curricula'
    | 'deep_dives'
    | 'vault_concepts';

export interface UsageCheckResult {
    allowed: boolean;
    used: number;
    limit: number | null; // null = unlimited
    remaining: number | null;
    percentUsed: number | null;
    featureName: FeatureName;
}

export async function checkUsage(
    userId: string,
    feature: FeatureName
): Promise<UsageCheckResult> {
    const { data: tracking } = await supabase
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .single();

    const plan = tracking?.plan || 'free';

    const { data: limits } = await supabase
        .from('plan_limits')
        .select('*')
        .eq('plan', plan)
        .single();

    if (!tracking || !limits) {
        return {
            allowed: false,
            used: 0,
            limit: 0,
            remaining: 0,
            percentUsed: 100,
            featureName: feature
        };
    }

    const limit = limits[`${feature}_limit`];
    const used = tracking[`${feature}_used`] ?? tracking.vault_concept_count;

    // vault_concepts uses a different column name for counting
    const actualUsed = feature === 'vault_concepts'
        ? tracking.vault_concept_count
        : tracking[`${feature}_used`];

    // Unlimited plan
    if (limit === null) {
        return {
            allowed: true,
            used: actualUsed,
            limit: null,
            remaining: null,
            percentUsed: null,
            featureName: feature
        };
    }

    return {
        allowed: actualUsed < limit,
        used: actualUsed,
        limit,
        remaining: limit - actualUsed,
        percentUsed: (actualUsed / limit) * 100,
        featureName: feature
    };
}

export async function incrementUsage(
    userId: string,
    feature: FeatureName,
    amount: number = 1
): Promise<void> {
    // Use RPC for atomic increment
    await supabase.rpc('increment_usage', {
        target_user_id: userId,
        feature_name: feature,
        amount: amount
    });
}
