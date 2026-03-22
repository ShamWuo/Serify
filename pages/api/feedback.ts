import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const userId = await authenticateApiRequest(req);
    // Feedback can be anonymous or authenticated
    
    const { type, content, url, userAgent, screenResolution } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Feedback content is required' });
    }

    try {
        const { error } = await supabase.from('user_feedback').insert({
            user_id: userId || null,
            type: type || 'other',
            content,
            url,
            user_agent: userAgent,
            screen_resolution: screenResolution
        });

        if (error) throw error;

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Feedback submission error:', error);
        return res.status(500).json({ error: 'Failed to submit feedback' });
    }
}
