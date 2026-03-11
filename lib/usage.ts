import { NextApiRequest } from 'next';
import { supabase, supabaseAdmin } from './supabase';

export async function authenticateApiRequest(req: NextApiRequest | Request): Promise<string | null> {
    // Handle demo mode
    const demoHeader = (req instanceof Request)
        ? req.headers.get('x-serify-demo')
        : (req as NextApiRequest).headers['x-serify-demo'];

    if (demoHeader === 'true') {
        return 'demo-user';
    }

    let authHeader: string | null = null;
    if (req instanceof Request) {
        authHeader = req.headers.get('authorization');
    } else {
        authHeader = (req as NextApiRequest).headers.authorization || null;
    }

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
    const client = supabaseAdmin || supabase;

    if (userId === 'demo-user') {
        return {
            allowed: true,
            used: 0,
            limit: null,
            remaining: null,
            percentUsed: 0,
            featureName: feature
        };
    }

    const { data: tracking } = await client
        .from('usage_tracking')
        .select('*')
        .eq('user_id', userId)
        .single();

    const plan = tracking?.plan || 'free';

    const { data: limits } = await client
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
    if (userId === 'demo-user') return;

    // Use RPC for atomic increment
    const client = supabaseAdmin || supabase;
    await client.rpc('increment_usage', {
        target_user_id: userId,
        feature_name: feature,
        amount: amount
    });
}
