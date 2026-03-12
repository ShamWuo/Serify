import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { classifyMessage } from '@/lib/serify-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId && userId !== 'demo-user') {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message, isFollowUpInTier3 } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Missing message' });
    }

    try {
        const tier = await classifyMessage(message, isFollowUpInTier3);
        return res.status(200).json({ tier });
    } catch (error: any) {
        console.error('Error in classify-message:', error);
        return res.status(500).json({ error: error.message || 'Internal server error' });
    }
}
