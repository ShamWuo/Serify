import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/usage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseServiceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!process.env.STRIPE_SECRET_KEY) {
        return res.status(500).json({ error: 'Stripe is not configured on the server' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { priceId, sparkAmount } = req.body;
    if (!priceId || !sparkAmount) {
        return res.status(400).json({ error: 'Missing priceId or sparkAmount' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data: user, error: userError } = await supabase
            .from('profiles')
            .select('email, display_name, stripe_customer_id')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        let customerId = user.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email || undefined,
                name: user.display_name || undefined,
                metadata: { userId }
            });
            customerId = customer.id;

            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', userId);
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'payment',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/sparks?success=true&amount=${sparkAmount}`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/sparks?canceled=true`,
            metadata: { userId, sparkAmount: String(sparkAmount) }
        });

        return res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error('Buy sparks checkout error:', error);
        return res.status(500).json({ error: 'Failed to create checkout session' });
    }
}
