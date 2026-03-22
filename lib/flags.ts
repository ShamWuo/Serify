import { supabase } from './supabase';

export type FeatureFlag = {
    key: string;
    is_enabled: boolean;
    rollout_percentage: number;
    rules: any[];
};

/**
 * Checks if a feature flag is enabled for a given user.
 * 
 * Logic:
 * 1. Global enable (is_enabled: true, rollout: 100)
 * 2. Rollout percentage (hashes user ID to a bucket 0-99)
 * 3. Specific rules (user ID match, tier match, etc.)
 */
export async function isFeatureEnabled(
    flagKey: string,
    userId?: string,
    metadata?: Record<string, any>
): Promise<boolean> {
    const { data: flag, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('key', flagKey)
        .single();

    if (error || !flag) {
        console.warn(`[Feature Flags] Flag not found: ${flagKey}`);
        return false;
    }

    // 1. If globally disabled, return false
    if (!flag.is_enabled) return false;

    // 2. If 100% rollout, return true
    if (flag.rollout_percentage === 100) return true;

    // 3. Check rules (e.g., target specific users or tiers)
    if (flag.rules && Array.isArray(flag.rules)) {
        for (const rule of flag.rules) {
            if (rule.type === 'user_id' && userId === rule.value) return true;
            if (rule.type === 'email' && metadata?.email === rule.value) return true;
            if (rule.type === 'tier' && metadata?.tier === rule.value) return true;
        }
    }

    // 4. Rollout percentage check
    if (flag.rollout_percentage > 0 && userId) {
        const bucket = getBucket(userId);
        return bucket < flag.rollout_percentage;
    }

    return flag.is_enabled && flag.rollout_percentage === 0;
}

/**
 * Deterministically assigns a user to a bucket 0-99 based on their ID.
 */
function getBucket(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = (hash << 5) - hash + userId.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash % 100);
}

/**
 * Fetches all enabled flags for a user.
 * Useful for initializing frontend context.
 */
export async function getAllEnabledFlags(
    userId?: string,
    metadata?: Record<string, any>
): Promise<string[]> {
    const { data: flags, error } = await supabase
        .from('feature_flags')
        .select('*')
        .eq('is_enabled', true);

    if (error || !flags) return [];

    const enabledKeys: string[] = [];
    
    for (const flag of flags) {
        // Simple check first
        if (flag.rollout_percentage === 100) {
            enabledKeys.push(flag.key);
            continue;
        }

        // Percentage check
        if (flag.rollout_percentage > 0 && userId) {
            if (getBucket(userId) < flag.rollout_percentage) {
                enabledKeys.push(flag.key);
                continue;
            }
        }

        // Rule check
        if (flag.rules && Array.isArray(flag.rules)) {
            let matched = false;
            for (const rule of flag.rules) {
                if (rule.type === 'user_id' && userId === rule.value) matched = true;
                if (rule.type === 'email' && metadata?.email === rule.value) matched = true;
                if (rule.type === 'tier' && metadata?.tier === rule.value) matched = true;
                if (matched) break;
            }
            if (matched) {
                enabledKeys.push(flag.key);
            }
        }
    }

    return enabledKeys;
}
