import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/db_types_new';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const userId = await authenticateApiRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { sessionId, answerSpace } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' });
  }
  
  const spaceConfig = answerSpace || 'medium'; // 'none', 'small', 'medium', 'large'

  try {
    // 1. Fetch Session Data
    const { data: session, error: sessionError } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();
        
    if (sessionError || !session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    
    // 2. Fetch Questions
    const { data: responses, error: responsesError } = await supabase
        .from('practice_responses')
        .select('*, knowledge_nodes(name)')
        .eq('practice_session_id', sessionId)
        .order('question_number', { ascending: true });
        
    if (responsesError || !responses) {
        return res.status(500).json({ error: 'Failed to fetch questions' });
    }
    
    // 3. Generate HTML Content for Print
    // In a real production app we'd use puppeteer or a service to render PDF.
    // Given the constraints, we'll return an HTML payload that the frontend can print,
    // or simulate a document structure. 
    
    const spacingStyle = 
        spaceConfig === 'large' ? 'height: 400px;' :
        spaceConfig === 'medium' ? 'height: 200px;' :
        spaceConfig === 'small' ? 'height: 80px;' : 'height: 20px;';

    let htmlContent = `
        <div style="font-family: sans-serif; max-width: 800px; margin: 0 auto; color: #333;">
            <div style="text-align: center; margin-bottom: 40px;">
                <h1 style="margin-bottom: 8px;">Serify Practice: ${session.tool.toUpperCase()}</h1>
                <p style="color: #666;">Generated on ${new Date().toLocaleDateString()}</p>
                ${session.time_limit_minutes ? `<p><strong>Time Limit:</strong> ${session.time_limit_minutes} minutes</p>` : ''}
            </div>
    `;
    
    responses.forEach((r: any, i: number) => {
        const conceptName = (r.knowledge_nodes as any)?.name || 'Concept';
        htmlContent += `
            <div style="margin-bottom: 30px; page-break-inside: avoid;">
                <h3 style="margin-bottom: 12px; font-size: 1.1rem;">
                    ${i + 1}. [${conceptName}] ${r.question_text}
                </h3>
                <div style="width: 100%; border: 1px solid #ddd; border-radius: 4px; ${spacingStyle}"></div>
            </div>
        `;
    });
    
    htmlContent += `</div>`;
    
    // 4. Record Export in DB
    const { data: exportData, error: exportError } = await supabase
        .from('practice_exports')
        .insert({
            user_id: userId,
            practice_session_id: sessionId,
            export_type: 'html_print',
            answer_space: spaceConfig
        })
        .select()
        .single();
        
    if (exportError) {
        console.error("Failed to log export:", exportError);
    }
    
    // Track Analytics
    await supabase.rpc('record_ai_message', {
       p_user_id: userId,
       p_message_type: 'practice_test_exported',
       p_token_count: 0
    });

    res.status(200).json({ html: htmlContent, exportId: exportData?.id });
  } catch (error: any) {
    console.error('API Error /api/practice/export:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
