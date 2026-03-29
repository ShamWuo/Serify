
import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabase';
import { authenticateApiRequest, incrementUsage } from '@/lib/usage';
import { v4 as uuidv4 } from 'uuid';

/**
 * API Handler to bridge a roadmap study session with the interactive learning flow.
 * Initializes a flow session with targeted context from the roadmap topic and exam goal.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: 'Database admin client not configured' });
  }

  try {
    const userId = await authenticateApiRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { roadmapSessionId } = req.body;
    if (!roadmapSessionId) {
      return res.status(400).json({ error: 'Missing roadmapSessionId' });
    }

    // 1. Fetch context (Roadmap Session -> Topic -> Roadmap Goal)
    const { data: session, error: sErr } = await supabaseAdmin
      .from('roadmap_sessions')
      .select(`
        *,
        roadmap_topics:topic_id (*),
        exam_roadmaps:roadmap_id (*)
      `)
      .eq('id', roadmapSessionId)
      .single();

    if (sErr || !session) {
      console.error('Error fetching roadmap session context:', sErr);
      return res.status(404).json({ error: 'Roadmap session context not found' });
    }

    const topic = (session as any).roadmap_topics;
    const roadmap = (session as any).exam_roadmaps;

    // 2. Check for an existing active flow session for this specific roadmap task
    const { data: existingFlow, error: efErr } = await supabaseAdmin
      .from('flow_sessions')
      .select('id')
      .eq('source_type', 'roadmap')
      .eq('source_session_id', roadmapSessionId)
      .eq('status', 'active')
      .maybeSingle();

    if (existingFlow) {
      return res.status(200).json({ flowSessionId: existingFlow.id });
    }

    // 3. Usage check - Starting a flow session consumes a slot
    const usage = await incrementUsage(userId, 'flow_sessions');
    if (!usage.allowed) {
      return res.status(403).json({ 
        error: 'Usage limit exceeded',
        details: 'You have reached your daily limit for interactive learning sessions.'
      });
    }

    // 4. Construct high-context initial plan for the interactive flow
    const flowSessionId = uuidv4();
    
    // Calculate targeted steps based on allocated session time (avg 10 min per step)
    const estimatedSteps = Math.max(2, Math.min(6, Math.ceil((session.scheduled_length_minutes || 30) / 10)));

    const planNodes = [{
      conceptId: topic.concept_id || `topic_\${uuidv4().substring(0, 8)}`,
      conceptName: topic.title,
      priority: 0,
      estimatedSteps,
      suggestedOpeningMove: 'orient',
      definition: topic.unit ? `Focus: \${topic.title} in the context of \${topic.unit}.` : `Core study session for \${topic.title}.`,
      currentMastery: topic.mastery_at_completion || 'not_started'
    }];

    const { data: flowSession, error: fsErr } = await supabaseAdmin
      .from('flow_sessions')
      .insert({
        id: flowSessionId,
        user_id: userId,
        source_type: 'roadmap',
        source_session_id: roadmapSessionId,
        source_topic: topic.title,
        initial_plan: {
          concepts: planNodes,
          overallStrategy: `Strategic study for \${topic.title}. This session is part of your "\${roadmap.title || roadmap.goal || 'exam'}" roadmap with a target of \${new Date(roadmap.exam_date).toLocaleDateString()}.`
        },
        status: 'active',
        created_at: new Date().toISOString()
      } as any)
      .select('id')
      .single();

    if (fsErr) {
      console.error('Error creating linked flow session:', fsErr);
      throw new Error('Failed to initialize interactive learning engine for roadmap');
    }

    return res.status(200).json({ 
      success: true,
      flowSessionId: flowSession.id,
      title: topic.title
    });

  } catch (error: any) {
    console.error('[Roadmap Session API] Error:', error);
    return res.status(500).json({ 
      error: 'Failed to start learning session',
      details: error.message 
    });
  }
}
