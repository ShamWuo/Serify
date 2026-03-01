import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
        data: { user },
        error: authError
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId, action } = req.body as { sessionId: string; action: 'share' | 'unshare' };

    if (req.method !== 'POST' || !sessionId || !action) {
        return res.status(400).json({ error: 'Bad request' });
    }

    // Verify session belongs to the user
    const { data: session, error: sessionError } = await supabaseAdmin
        .from('reflection_sessions')
        .select('id, title, user_id, is_public, depth_score')
        .eq('id', sessionId)
        .single();

    if (sessionError || !session || session.user_id !== user.id) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const isPublic = action === 'share';

    const { error: updateError } = await supabaseAdmin
        .from('reflection_sessions')
        .update({ is_public: isPublic })
        .eq('id', sessionId);

    if (updateError) {
        return res.status(500).json({ error: 'Failed to update share status' });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const shareUrl = `${siteUrl}/s/${sessionId}`;

    return res.status(200).json({
        success: true,
        isPublic,
        shareUrl: isPublic ? shareUrl : null
    });
}
