import { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest } from '@/lib/sparks';

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('stripe_customer_id, display_name')
            .eq('id', userId)
            .single();

        if (profileError || !profile) {
            console.error('Profile fetch error or not found:', profileError, userId);
            return res.status(404).json({ error: 'User profile not found.' });
        }

        // Fetch email from auth since it's not in profiles
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
        const email = user?.email;

        let customerId = profile.stripe_customer_id;

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

        // Auto-create customer if missing or invalid for this environment
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: email || undefined,
                name: profile.display_name || undefined,
                metadata: { userId }
            });
            customerId = customer.id;

            await supabase
                .from('profiles')
                .update({ stripe_customer_id: customerId })
                .eq('id', userId);
        }

        const returnUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`;

        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl
        });

        return res.status(200).json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe portal error:', error);
        return res.status(500).json({ error: 'Failed to create billing portal session' });
    }
}
