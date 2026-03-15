import type { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest, checkUsage } from '@/lib/usage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const allowance = await checkUsage(userId, 'session_standard');
        return res.status(200).json(allowance);
    } catch (err: any) {
        console.error('Allowance error:', err);
        return res.status(500).json({ error: 'Failed to check allowance' });
    }
}
