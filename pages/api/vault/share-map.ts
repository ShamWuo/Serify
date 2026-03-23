import { NextApiRequest, NextApiResponse } from 'next';
import { authenticateApiRequest } from '@/lib/usage';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false, autoRefreshToken: false } });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await authenticateApiRequest(req);
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('share_token, is_map_public')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return res.status(200).json(profile);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body; 

    try {
      let update: any = {};
      if (action === 'enable') {
        const { data: profile } = await supabase.from('profiles').select('share_token').eq('id', userId).single();
        update = { 
          is_map_public: true,
          share_token: profile?.share_token || uuidv4()
        };
      } else if (action === 'disable') {
        update = { is_map_public: false };
      } else if (action === 'regenerate') {
        update = { share_token: uuidv4() };
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(update)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json(data);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
