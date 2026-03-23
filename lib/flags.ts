import { supabase } from './supabase';

export type FeatureFlag = {
    key: string;
    is_enabled: boolean;
    rollout_percentage: number;
    rules: any[];
};

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

    
    if (!flag.is_enabled) return false;

    
    if (flag.rollout_percentage === 100) return true;

    
    if (flag.rules && Array.isArray(flag.rules)) {
        for (const rule of flag.rules) {
            if (rule.type === 'user_id' && userId === rule.value) return true;
            if (rule.type === 'email' && metadata?.email === rule.value) return true;
            if (rule.type === 'tier' && metadata?.tier === rule.value) return true;
        }
    }

    
    if (flag.rollout_percentage > 0 && userId) {
        const bucket = getBucket(userId);
        return bucket < flag.rollout_percentage;
    }

    
    
    return false;
}

function getBucket(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = (hash << 5) - hash + userId.charCodeAt(i);
        hash |= 0; 
    }
    return Math.abs(hash % 100);
}

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
        
        if (flag.rollout_percentage === 100) {
            enabledKeys.push(flag.key);
            continue;
        }

        
        if (flag.rollout_percentage > 0 && userId) {
            if (getBucket(userId) < flag.rollout_percentage) {
                enabledKeys.push(flag.key);
                continue;
            }
        }

        
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
