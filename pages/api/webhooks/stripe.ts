import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';
import { addDays } from 'date-fns';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const config = {
    api: {
        bodyParser: false,
    },
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

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object as any;
                const userId = session.metadata?.userId;

                if (!userId) break;

                if (session.mode === 'subscription') {

                    const plan = getPlanFromPriceId(session);

                    await supabase.from('subscriptions').upsert({
                        user_id: userId,
                        stripe_subscription_id: session.subscription as string,
                        plan: plan,
                        status: 'active',
                    }, { onConflict: 'stripe_subscription_id' });

                    await supabase.from('profiles').update({ subscription_tier: plan }).eq('id', userId);
                } else if (session.mode === 'payment') {

                    const sparkAmount = parseInt(session.metadata?.sparkAmount || '0', 10);
                    if (sparkAmount > 0) {
                        await supabase.rpc('add_topup_sparks', {
                            p_user_id: userId,
                            p_amount: sparkAmount,
                            p_stripe_payment_intent_id: session.payment_intent as string
                        });
                    } else if (session.payment_intent) {

                        await supabase.from('purchases').insert({
                            user_id: userId,
                            stripe_payment_intent_id: session.payment_intent as string,
                            product: 'deepdive',
                            amount_cents: session.amount_total || 400,
                            expires_at: addDays(new Date(), 7).toISOString(),
                        });
                    }
                }
                break;

            case 'customer.subscription.created':
            case 'customer.subscription.updated':
                const subscription = event.data.object as any;
                const subPlan = await getPlanFromSubscription(subscription.id);
                const subUserId = subscription.metadata?.userId || (await getUserIdFromCustomer(subscription.customer as string, supabase));

                if (subUserId) {
                    await supabase.from('subscriptions').upsert({
                        user_id: subUserId,
                        stripe_subscription_id: subscription.id,
                        plan: subPlan,
                        status: subscription.status,
                        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        seats: subscription.items.data[0]?.quantity || 1
                    }, { onConflict: 'stripe_subscription_id' });

                    await supabase.from('profiles').update({ subscription_tier: subPlan }).eq('id', subUserId);
                }
                break;

            case 'customer.subscription.deleted':
                const deletedSub = event.data.object as any;
                const delUserId = deletedSub.metadata?.userId || (await getUserIdFromCustomer(deletedSub.customer as string, supabase));

                if (delUserId) {
                    await supabase.from('subscriptions').update({ status: 'canceled' }).eq('stripe_subscription_id', deletedSub.id);
                    await supabase.from('profiles').update({ subscription_tier: 'free' }).eq('id', delUserId);
                }
                break;

            case 'invoice.payment_succeeded':
                const invoice = event.data.object as any;
                if (invoice.subscription) {
                    const subId = invoice.subscription as string;
                    const subPlan = await getPlanFromSubscription(subId);

                    const sparkGrant = subPlan === 'pro' || subPlan === 'teams' ? 150 : 0;

                    if (sparkGrant > 0) {
                        const invoiceUserId = await getUserIdFromCustomer(invoice.customer as string, supabase);
                        if (invoiceUserId) {
                            await supabase.rpc('refresh_subscription_sparks', {
                                p_user_id: invoiceUserId,
                                p_amount: sparkGrant
                            });
                        }
                    }
                }
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (err: any) {
        console.error(`Webhook handler failed: ${err.message}`);
        res.status(500).json({ error: 'Webhook handler failed' });
    }
}

function getPlanFromPriceId(session: any) {

    return 'pro';
}

async function getPlanFromSubscription(subId: string) {
    try {
        const sub = await stripe.subscriptions.retrieve(subId);
        const priceId = sub.items.data[0].price.id;

        if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_TEAMS_MONTHLY) return 'teams';
        if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY ||
            priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY) return 'pro';
    } catch (e) { }
    return 'pro';
}

async function getUserIdFromCustomer(customerId: string, supabase: any) {
    const { data } = await supabase.from('profiles').select('id').eq('stripe_customer_id', customerId).single();
    return data?.id;
}
