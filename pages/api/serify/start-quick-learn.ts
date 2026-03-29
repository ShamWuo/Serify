
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest, incrementUsage } from '@/lib/usage';
import { v4 as uuidv4 } from 'uuid';
import { generateSessionTitle } from '@/lib/serify-ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('[StartQuickLearn] Missing Supabase configuration');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    try {
        const userId = await authenticateApiRequest(req);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { content, contentType } = req.body;
        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const usage = await incrementUsage(userId, 'flow_sessions');
        if (!usage.allowed) {
            return res.status(403).json({ 
                error: 'Usage limit exceeded',
                details: 'You have reached your free plan limit. Upgrade for more sessions.'
            });
        }

        const sessionId = uuidv4();

        const aiTitle = await generateSessionTitle(content, contentType || 'quick session');
        const displayTitle = `Quick Learn: ${aiTitle}`;

        // Prepare some dummy plan nodes for Quick Learn
        const planNodes = [{
            conceptId: `quick_${uuidv4().substring(0, 8)}`,
            conceptName: aiTitle,
            priority: 0,
            estimatedSteps: 2,
            suggestedOpeningMove: 'orient',
            prerequisiteCheck: `Understanding of ${aiTitle}`,
            definition: `Core principles of ${aiTitle}`,
            currentMastery: 'not_started'
        }];

        const { data: flowSession, error: fsErr } = await supabaseAdmin
            .from('flow_sessions')
            .insert({
                id: sessionId,
                user_id: userId,
                source_type: 'quick',
                source_topic: aiTitle,
                initial_plan: {
                    concepts: planNodes,
                    overallStrategy: displayTitle
                },
                concepts_completed: [],
                status: 'active',
                created_at: new Date().toISOString()
            })
            .select('id')
            .maybeSingle();

        if (fsErr) {
            console.error('[StartQuickLearn] Supabase insertion error:', fsErr);
            return res.status(500).json({ error: 'Failed to create session storage', details: fsErr.message });
        }

        if (!flowSession) {
            console.error('[StartQuickLearn] No session returned after insertion');
            return res.status(500).json({ error: 'Session was not created correctly' });
        }

        return res.status(200).json({ 
            flowSessionId: flowSession.id,
            title: aiTitle
        });

    } catch (error: any) {
        console.error('[StartQuickLearn] Error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack,
            fullError: error
        });
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error.message
        });
    }
}
