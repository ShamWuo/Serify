import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/usage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Supabase configuration missing');
        return res.status(500).json({ error: 'Database is not configured on the server' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const authenticatedUserId = await authenticateApiRequest(req);
    if (!authenticatedUserId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const { priceId, planName } = req.body;
        const userId = authenticatedUserId;

        if (!priceId || !planName) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const { data: user } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
        const email = authUser?.email;

        let customerId = user.stripe_customer_id;

        if (customerId) {
            try {
                await stripe.customers.retrieve(customerId);
            } catch (stripeError: any) {
                if (stripeError.statusCode === 404) customerId = null;
                else throw stripeError;
            }
        }

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: email || undefined,
                name: user.display_name || undefined,
                metadata: { userId }
            });
            customerId = customer.id;
            await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?canceled=true`,
            allow_promotion_codes: true,
            subscription_data: {
                metadata: { userId, plan: planName }
            },
            metadata: { userId, plan: planName }
        });

        return res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe checkout error:', error);
        return res.status(500).json({ error: 'Failed to create checkout session' });
    }
}
