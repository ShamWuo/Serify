import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const config = {
    api: {
        bodyParser: false
    }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!supabaseUrl || !supabaseKey || !webhookSecret) {
        console.error('Missing configuration for Stripe webhook');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const reqBuffer = await buffer(req);
    const signature = req.headers['stripe-signature'] as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(reqBuffer, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Idempotency check
    const { data: existingEvent } = await supabase
        .from('processed_webhook_events')
        .select('id')
        .eq('stripe_event_id', event.id)
        .maybeSingle();

    if (existingEvent) {
        return res.json({ received: true, alreadyProcessed: true });
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                if (session.mode === 'subscription') {
                    const subscription = await stripe.subscriptions.retrieve(session.subscription) as any;
                    const userId = session.metadata?.userId || subscription.metadata?.userId;
                    const plan = subscription.metadata?.plan || getPlanFromPriceId(subscription.items.data[0].price.id);

                    if (userId) {
                        await supabase.from('subscriptions').upsert({
                            user_id: userId,
                            plan: plan,
                            stripe_customer_id: session.customer as string,
                            stripe_subscription_id: subscription.id,
                            stripe_price_id: subscription.items.data[0].price.id,
                            status: subscription.status,
                            billing_interval: subscription.items.data[0].plan.interval,
                            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        }, { onConflict: 'user_id' });

                        await supabase
                            .from('usage_tracking')
                            .update({
                                plan: plan,
                                period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                                period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                            })
                            .eq('user_id', userId);
                    }
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object as any;
                if (invoice.billing_reason === 'subscription_cycle') {
                    const userId = await getUserIdFromCustomer(invoice.customer as string, supabase);
                    if (userId) {
                        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string) as any;
                        await supabase.from('usage_tracking').update({
                            sessions_used: 0,
                            flashcards_used: 0,
                            quizzes_used: 0,
                            ai_messages_used: 0,
                            flow_sessions_used: 0,
                            curricula_used: 0,
                            deep_dives_used: 0,
                            period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                            period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        }).eq('user_id', userId);
                    }
                }
                break;
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as any;
                const userId = subscription.metadata?.userId || await getUserIdFromCustomer(subscription.customer as string, supabase);
                const newPlan = subscription.metadata?.plan || getPlanFromPriceId(subscription.items.data[0].price.id);

                if (userId) {
                    const { data: subData } = await supabase.from('subscriptions').select('plan').eq('user_id', userId).single();
                    const oldPlan = subData?.plan || 'free';
                    const isUpgrade = (newPlan === 'proplus' && oldPlan === 'pro') || (newPlan !== 'free' && oldPlan === 'free');

                    if (isUpgrade) {
                        await supabase.from('usage_tracking').update({ plan: newPlan }).eq('user_id', userId);
                        await supabase.from('subscriptions').update({
                            plan: newPlan,
                            status: subscription.status,
                            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        }).eq('user_id', userId);
                    } else {
                        await supabase.from('subscriptions').update({
                            pending_plan: newPlan,
                            status: subscription.status,
                            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                            cancel_at_period_end: subscription.cancel_at_period_end
                        }).eq('user_id', userId);
                    }
                }
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any;
                const userId = await getUserIdFromCustomer(subscription.customer as string, supabase);
                if (userId) {
                    await supabase.from('usage_tracking').update({ plan: 'free' }).eq('user_id', userId);
                    await supabase.from('subscriptions').update({ status: 'cancelled', plan: 'free' }).eq('user_id', userId);
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as any;
                const userId = await getUserIdFromCustomer(invoice.customer as string, supabase);
                if (userId && invoice.subscription) {
                    await supabase.from('subscriptions').update({ status: 'past_due' }).eq('user_id', userId);
                }
                break;
            }
        }

        // Mark event as processed
        await supabase.from('processed_webhook_events').insert({ stripe_event_id: event.id });

        res.json({ received: true });
    } catch (err: any) {
        console.error(`Webhook handler failed: ${err.message}`);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
}

function getPlanFromPriceId(priceId: string) {
    if (priceId === process.env.STRIPE_PRICE_ID_PRO_MONTHLY || priceId === process.env.STRIPE_PRICE_ID_PRO_YEARLY) return 'pro';
    if (priceId === process.env.STRIPE_PRICE_ID_PROPLUS_MONTHLY || priceId === process.env.STRIPE_PRICE_ID_PROPLUS_YEARLY) return 'proplus';
    return 'free';
}

async function getUserIdFromCustomer(customerId: string, supabase: any) {
    const { data } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

    if (data) return data.user_id;

    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .maybeSingle();

    return profile?.id;
}
