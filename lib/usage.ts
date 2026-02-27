import { supabase } from './supabase';

function getCurrentMonth(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

export async function checkSessionAllowance(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    reason?: string;
    passId?: string;
}> {

    const { data: user } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();

    const plan = user?.subscription_tier || 'free';

    if (['pro', 'teams'].includes(plan)) {
        return { allowed: true, remaining: Infinity };
    }

    const { data: deepdivePasses } = await supabase
        .from('purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('product', 'deepdive')
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .limit(1);

    if (deepdivePasses && deepdivePasses.length > 0) {
        return { allowed: true, remaining: 1, passId: deepdivePasses[0].id };
    }

    const currentMonth = getCurrentMonth();

    let { data: usage } = await supabase
        .from('usage')
        .select('session_count')
        .eq('user_id', userId)
        .eq('month', currentMonth)
        .single();

    if (!usage) {

        usage = { session_count: 0 };
    }

    const sessionLimit = 3;
    const remaining = Math.max(0, sessionLimit - (usage.session_count || 0));

    if (remaining === 0) {
        return {
            allowed: false,
            remaining: 0,
            reason: 'monthly_limit_reached',
        };
    }

    return { allowed: true, remaining };
}

export async function incrementSessionUsage(userId: string, passId?: string) {
    if (passId) {

        await supabase
            .from('purchases')
            .update({ used: true, used_at: new Date().toISOString() })
            .eq('id', passId);
        return;
    }

    const currentMonth = getCurrentMonth();

    const { data: existing } = await supabase
        .from('usage')
        .select('session_count')
        .eq('user_id', userId)
        .eq('month', currentMonth)
        .single();

    if (existing) {
        await supabase
            .from('usage')
            .update({
                session_count: existing.session_count + 1,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .eq('month', currentMonth);
    } else {
        await supabase
            .from('usage')
            .insert({
                user_id: userId,
                month: currentMonth,
                session_count: 1,
            });
    }
}
