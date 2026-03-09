import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/usage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase configuration missing');
        return res.status(500).json({ error: 'Database is not configured on the server' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('STRIPE_SECRET_KEY is missing');
        return res.status(500).json({ error: 'Stripe is not configured on the server' });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.error('Supabase keys are missing');
        return res.status(500).json({ error: 'Database is not configured on the server' });
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const authenticatedUserId = await authenticateApiRequest(req);
    if (!authenticatedUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { priceId, quantity = 1 } = req.body;
        const userId = authenticatedUserId;

        if (!priceId) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            console.error('User profile not found:', userError);
            return res.status(404).json({ error: 'User profile not found' });
        }

        // Fetch email from auth since it's not in profiles
        const { data: { user: authUser }, error: authUserError } = await supabase.auth.admin.getUserById(userId);
        const email = authUser?.email;

        // Guard: block re-subscription if the user already has an active subscription
        const isDeepDiveCheck = priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_DEEPDIVE;
        if (!isDeepDiveCheck) {
            const { data: existingSub } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', userId)
                .in('status', ['active', 'trialing'])
                .maybeSingle();

            if (existingSub) {
                return res.status(409).json({
                    error: 'already_subscribed',
                    message: 'You already have an active subscription. Manage it from your billing settings.'
                });
            }
        }

        let customerId = user.stripe_customer_id;

        // Verify if the customer exists in the current Stripe environment
        if (customerId) {
            try {
                await stripe.customers.retrieve(customerId);
            } catch (stripeError: any) {
                if (stripeError.code === 'resource_missing' || stripeError.statusCode === 404) {
                    console.log(`Customer ${customerId} not found in current environment. Creating new one.`);
                    customerId = null; // Mark for re-creation
                } else {
                    throw stripeError; // Re-throw other errors
                }
            }
        }

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: email || undefined,
                name: user.display_name || undefined,
                metadata: { userId }
            });
            customerId = customer.id;

            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', userId);
        }

        const isDeepDive = priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_DEEPDIVE;

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: isDeepDive ? 'payment' : 'subscription',
            line_items: [
                {
                    price: priceId,
                    quantity: quantity
                }
            ],
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?canceled=true`,
            allow_promotion_codes: true,
            subscription_data: !isDeepDive
                ? {
                    metadata: { userId }
                }
                : undefined,
            metadata: { userId }
        });

        return res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe checkout error:', error);
        return res.status(500).json({ error: 'Failed to create checkout session' });
    }
}
