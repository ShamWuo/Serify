import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { authenticateApiRequest, incrementUsage } from '@/lib/usage';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const userId = await authenticateApiRequest(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { reflectionSessionId } = req.body;
    if (!reflectionSessionId) return res.status(400).json({ error: 'Missing reflectionSessionId' });

    try {
        // 1. Verify reflection session exists and belongs to user
        const { data: reflectionSession, error: rsErr } = await supabaseAdmin
            .from('reflection_sessions')
            .select('*')
            .eq('id', reflectionSessionId)
            .eq('user_id', userId)
            .maybeSingle();

        if (rsErr || !reflectionSession) {
            console.error('Reflection session not found or error:', rsErr);
            return res.status(404).json({ error: 'Reflection session not found' });
        }

        // 2. Check for an existing ACTIVE flow session for THIS reflection session
        // This is the core deduplication logic
        const { data: existingSession } = await supabaseAdmin
            .from('flow_sessions')
            .select('id')
            .eq('user_id', userId)
            .eq('source_type', 'reflection')
            .eq('source_session_id', reflectionSessionId)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (existingSession) {
            return res.status(200).json({ flowSessionId: existingSession.id });
        }

        // 3. Increment usage for new flow session creation
        const usage = await incrementUsage(userId, 'flow_sessions');
        if (!usage.allowed) {
            return res.status(403).json({
                error: 'limit_reached',
                message: 'You have reached your feature limit.'
            });
        }

        // 4. Create new flow session
        // Prepare initial plan nodes from extracted concepts
        const extractedConcepts = reflectionSession.extracted_concepts || [];
        const planNodes = extractedConcepts.map((c: any, idx: number) => ({
            conceptId: c.id || `concept_${idx}`,
            conceptName: c.name,
            priority: idx,
            estimatedSteps: 3,
            suggestedOpeningMove: 'orient',
            prerequisiteCheck: c.description,
            definition: c.description,
            currentMastery: 'developing'
        }));

        const sessionId = uuidv4();
        const { data: flowSession, error: fsErr } = await supabaseAdmin
            .from('flow_sessions')
            .insert({
                id: sessionId,
                user_id: userId,
                source_type: 'reflection',
                source_session_id: reflectionSessionId,
                initial_plan: {
                    concepts: planNodes,
                    overallStrategy: `Deep Dive: ${reflectionSession.title || 'Untitled Session'}`
                },
                concepts_completed: [],
                status: 'active'
            })
            .select('id')
            .single();

        if (fsErr || !flowSession) {
            console.error('Failed creating flow session', fsErr);
            return res.status(500).json({ error: 'Failed to create flow session' });
        }

        return res.status(200).json({ flowSessionId: flowSession.id });
    } catch (error: any) {
        console.error('Error starting reflection flow:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
