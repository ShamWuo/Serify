import { NextApiRequest, NextApiResponse } from 'next';
import { preAnalyzePrompt } from '@/lib/clarification-ai';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { content, contentType, mode } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    const analysis = await preAnalyzePrompt(content, contentType, mode);
    return res.status(200).json(analysis);
  } catch (error: any) {
    console.error('[Pre-Analyze API] Error:', error);
    return res.status(500).json({ error: 'Failed to analyze prompt' });
  }
}
