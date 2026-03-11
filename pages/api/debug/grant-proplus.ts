import { createClient } from '@supabase/supabase-js';
import type { NextApiRequest, NextApiResponse } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Need service role for force update

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).send('Unauthorized');
  const token = authHeader.replace('Bearer ', '');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Get user from token
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return res.status(401).send('Unauthorized');

  // 1. Update or Insert Usage Tracking
  const { data: existingUsage } = await supabase
    .from('usage_tracking')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const usagePayload = {
    plan: 'proplus',
    period_start: new Date().toISOString(),
    period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    sessions_used: 0,
    flashcards_used: 0,
    quizzes_used: 0,
    ai_messages_used: 0,
    flow_sessions_used: 0,
    curricula_used: 0,
    deep_dives_used: 0
  };

  let usageError;
  if (existingUsage) {
    const { error } = await supabase.from('usage_tracking').update(usagePayload).eq('user_id', user.id);
    usageError = error;
  } else {
    const { error } = await supabase.from('usage_tracking').insert({ ...usagePayload, user_id: user.id });
    usageError = error;
  }

  // 2. Update or Insert Subscription
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  const subPayload = {
    plan: 'proplus',
    status: 'active',
    billing_interval: 'month',
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    stripe_subscription_id: 'sub_debug_' + user.id.slice(0, 8),
    stripe_customer_id: 'cus_debug_' + user.id.slice(0, 8),
    stripe_price_id: 'price_debug_proplus'
  };

  let subError;
  if (existingSub) {
    const { error } = await supabase.from('subscriptions').update(subPayload).eq('user_id', user.id);
    subError = error;
  } else {
    const { error } = await supabase.from('subscriptions').insert({ ...subPayload, user_id: user.id });
    subError = error;
  }

  if (usageError || subError) {
    console.error('Grant Pro+ error:', usageError || subError);
    return res.status(500).json({ error: (usageError || subError)?.message });
  }

  // 3. Update Profile for Auth Context
  await supabase.from('profiles').update({ subscription_tier: 'proplus' }).eq('id', user.id);

  return res.status(200).json({ success: true, message: 'Pro+ granted' });
}
