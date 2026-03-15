import { NextApiRequest } from 'next';
import { supabase, supabaseAdmin } from './supabase';
import { classifyMessage, MessageTier } from './serify-ai';

export async function authenticateApiRequest(req: NextApiRequest | Request): Promise<string | null> {
    // Handle demo mode
    let demoHeader: string | null = null;
    if (req instanceof Request) {
        demoHeader = req.headers.get('x-serify-demo');
    } else {
        const headers = (req as NextApiRequest).headers;
        demoHeader = (headers['x-serify-demo'] as string) || (headers['X-Serify-Demo'] as string) || null;
    }

    if (demoHeader === 'true') {
        return 'demo-user';
    }

    let authHeader: string | null = null;
    if (req instanceof Request) {
        authHeader = req.headers.get('authorization');
    } else {
        authHeader = (req as NextApiRequest).headers.authorization || null;
    }

    if (!authHeader) {
        console.warn('[Auth] No authorization header found');
        return null;
    }

    const token = authHeader.split(' ').pop();
    if (!token || token === 'undefined' || token === 'null') {
        console.warn('[Auth] Malformed or missing token in header');
        return null;
    }

    try {
        // Use admin client if available for more reliable token verification on server-side
        const client = supabaseAdmin || supabase;
        const { data: { user }, error } = await client.auth.getUser(token);
        
        if (error || !user) {
            console.error('[Auth] getUser error:', error?.message || 'No user returned');
            
            // Fallback to non-admin client if admin failed for some reason
            if (client === supabaseAdmin) {
                const { data: { user: fallbackUser }, error: fallbackError } = await supabase.auth.getUser(token);
                if (!fallbackError && fallbackUser) return fallbackUser.id;
            }
            
            return null;
        }
        return user.id;
    } catch (err: any) {
        console.error('[Auth] Unexpected error during authentication:', err.message);
        return null;
    }
}

export type TokenAction = 
    | 'session_standard'
    | 'session_pdf'
    | 'ai_message_tier1'
    | 'ai_message_tier2'
    | 'ai_message_tier3'
    | 'flow_sessions'
    | 'flow_mode_step'
    | 'curricula'
    | 'flashcard_generation'
    | 'practice_exam'
    | 'practice_scenario'
    | 'practice_review'
    | 'practice_pdf_export'
    | 'practice_quiz'
    | 'practice_test_generation'
    | 'practice_quiz_generation'
    | 'practice_exam_generation'
    | 'practice_flashcards_generation'
    | 'practice_scenario_generation'
    | 'deep_dive'
    | 'manual_synthesis';

export interface UsageCheckResult {
    allowed: boolean;
    cost: number;
    tokensUsed: number;
    monthlyLimit: number | null;
    percentUsed: number | null;
    plan: string;
    featureName?: string;
}

export async function canAfford(
    userId: string,
    action: TokenAction
): Promise<UsageCheckResult> {
    const client = supabaseAdmin || supabase;

    if (userId === 'demo-user') {
        return {
            allowed: true,
            cost: 0,
            tokensUsed: 0,
            monthlyLimit: null,
            percentUsed: 0,
            plan: 'free'
        };
    }

    const { data: tracking } = await client
        .from('usage_tracking')
        .select('plan, tokens_used, monthly_limit')
        .eq('user_id', userId)
        .single();

    const { data: costData } = await client
        .from('token_costs')
        .select('token_cost')
        .eq('action', action)
        .single();

    if (!tracking || !costData) {
        return { allowed: false, cost: 0, tokensUsed: 0, monthlyLimit: 0, percentUsed: 100, plan: 'free' };
    }

    const { plan, tokens_used, monthly_limit } = tracking;
    const cost = costData.token_cost;

    if (plan === 'proplus') return { allowed: true, cost: 0, tokensUsed: 0, monthlyLimit: null, percentUsed: 0, plan: 'proplus' };
    
    const allowed = cost === 0 || (tokens_used + cost <= monthly_limit);
    
    return {
        allowed,
        cost,
        tokensUsed: tokens_used,
        monthlyLimit: monthly_limit,
        percentUsed: monthly_limit ? (tokens_used / monthly_limit) * 100 : 0,
        plan,
        featureName: action
    };
}

export async function consumeTokens(
    userId: string,
    action: TokenAction,
    referenceId?: string
): Promise<UsageCheckResult> {
    if (userId === 'demo-user') {
        return { allowed: true, cost: 0, tokensUsed: 0, monthlyLimit: null, percentUsed: 0, plan: 'free' };
    }

    const client = supabaseAdmin || supabase;
    
    // Map action to category for the DB update
    const categories: Record<string, string> = {
        'session_standard': 'sessions',
        'session_pdf': 'sessions',
        'ai_message_tier2': 'ai_messages',
        'ai_message_tier3': 'ai_messages',
        'flow_sessions': 'flow_mode',
        'flow_mode_step': 'flow_mode',
        'curricula': 'learn_mode',
        'flashcard_generation': 'flashcards',
        'practice_exam': 'practice',
        'practice_scenario': 'practice',
        'practice_review': 'practice',
        'practice_pdf_export': 'practice',
        'practice_quiz': 'practice',
        'practice_test_generation': 'practice',
        'practice_quiz_generation': 'practice',
        'practice_exam_generation': 'practice',
        'practice_flashcards_generation': 'practice',
        'practice_scenario_generation': 'practice',
        'deep_dive': 'deep_dives',
        'manual_synthesis': 'other',
    };
    const category = categories[action] || 'other';

    const { data, error } = await client.rpc('consume_tokens', {
        p_user_id: userId,
        p_action: action,
        p_category: category,
        p_reference_id: referenceId
    });

    if (error || !data) {
        console.error('Token consumption error:', error);
        throw new Error('Failed to process usage tokens');
    }

    const result = data as any;
    return {
        allowed: result.allowed,
        cost: result.cost,
        tokensUsed: result.tokens_used,
        monthlyLimit: result.monthly_limit,
        percentUsed: result.monthly_limit ? (result.tokens_used / result.monthly_limit) * 100 : 0,
        plan: result.plan,
        featureName: action
    };
}

export async function processAssistantMessage(
  userId: string,
  message: string,
  isFollowUpInTier3: boolean = false
): Promise<{ allowed: boolean; tier: MessageTier; remaining: number | null }> {
  if (userId === 'demo-user') {
      return { allowed: true, tier: 'tier1', remaining: null };
  }

  const client = supabaseAdmin || supabase;
  
  // Get plan and usage
  const { data: tracking } = await client
      .from('usage_tracking')
      .select('plan, tokens_used, monthly_limit')
      .eq('user_id', userId)
      .single();

  const plan = tracking?.plan || 'free';

  // Pro+ skips everything
  if (plan === 'proplus') {
    return { allowed: true, tier: 'tier1', remaining: null };
  }

  // Classify the message
  const tier = await classifyMessage(message, isFollowUpInTier3);
  const action = tier === 'tier3' ? 'ai_message_tier3' : (tier === 'tier2' ? 'ai_message_tier2' : 'ai_message_tier1');

  if (action === 'ai_message_tier1') {
      return { allowed: true, tier, remaining: null };
  }

  const result = await consumeTokens(userId, action as TokenAction);
  
  return { 
      allowed: result.allowed, 
      tier, 
      remaining: result.monthlyLimit ? result.monthlyLimit - result.tokensUsed : null 
  };
}

export type FeatureName = TokenAction;

/**
 * Backward compatibility: checkUsage
 */
export async function checkUsage(
    userId: string,
    feature: FeatureName
): Promise<UsageCheckResult> {
    return canAfford(userId, feature);
}

/**
 * Backward compatibility: incrementUsage
 */
export async function incrementUsage(
    userId: string,
    feature: FeatureName,
    amount: number = 1 // ignored in new system as costs are defined in DB
): Promise<UsageCheckResult> {
    return consumeTokens(userId, feature);
}
