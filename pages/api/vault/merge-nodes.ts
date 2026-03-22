import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';
import { authenticateApiRequest } from '@/lib/usage';

const MASTERY_ORDER: Record<string, number> = { revisit: 0, shaky: 1, developing: 2, solid: 3 };

function getWorseMastery(m1: string, m2: string): string {
    const v1 = MASTERY_ORDER[m1] ?? 1;
    const v2 = MASTERY_ORDER[m2] ?? 1;
    return v1 < v2 ? m1 : m2;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userId = await authenticateApiRequest(req);
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { sourceId, targetId } = req.body;

        if (!sourceId || !targetId || sourceId === targetId) {
            return res.status(400).json({ error: 'Valid sourceId and targetId are required' });
        }

        // Fetch both nodes
        const { data: nodes, error: fetchErr } = await supabase
            .from('knowledge_nodes')
            .select('*')
            .in('id', [sourceId, targetId]);

        if (fetchErr || !nodes || nodes.length !== 2) {
            return res.status(404).json({ error: 'Nodes not found' });
        }

        const sourceNode = nodes.find(n => n.id === sourceId);
        const targetNode = nodes.find(n => n.id === targetId);

        if (sourceNode.user_id !== userId || targetNode.user_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Combine history
        const sourceHistory = sourceNode.mastery_history || [];
        const targetHistory = targetNode.mastery_history || [];
        const combinedHistory = [...sourceHistory, ...targetHistory].sort((a: any, b: any) => {
            return new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime();
        });

        // Determine worse mastery
        const worseMastery = getWorseMastery(sourceNode.current_mastery, targetNode.current_mastery);

        // Update Target Node (keep this one)
        const { error: updateTargetErr } = await supabase
            .from('knowledge_nodes')
            .update({
                current_mastery: worseMastery,
                mastery_history: combinedHistory
            })
            .eq('id', targetId);

        if (updateTargetErr) throw updateTargetErr;

        // Archive Source Node (hide this one)
        const { error: archiveSourceErr } = await supabase
            .from('knowledge_nodes')
            .update({
                is_archived: true,
                display_name: `[Merged into ${targetNode.display_name}] ${sourceNode.display_name}`
            })
            .eq('id', sourceId);

        if (archiveSourceErr) throw archiveSourceErr;

        return res.status(200).json({ success: true, targetId });
    } catch (e: any) {
        console.error('Merge nodes error:', e);
        return res.status(500).json({ error: e.message || 'Internal server error' });
    }
}
