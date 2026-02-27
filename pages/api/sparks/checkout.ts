import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/sparks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { priceId } = req.body;

    if (!priceId) {
        return res.status(400).json({ message: 'Price ID is required' });
    }

    const user = await authenticateApiRequest(req);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {

        console.log(`Mock Stripe Checkout initiated for user ${user} and price ${priceId}`);

        const mockSuccessUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/sparks?success=true`;

        res.status(200).json({ url: mockSuccessUrl });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ message: 'Failed to create checkout session' });
    }
}
