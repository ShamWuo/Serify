import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, error: oauthError, error_description } = req.query;

  console.log('OAuth callback received:', {
    hasCode: !!code,
    hasError: !!oauthError,
    queryKeys: Object.keys(req.query)
  });

  if (oauthError) {
    const errorMsg = error_description
      ? `${oauthError}: ${error_description}`
      : oauthError;
    console.error('OAuth error:', errorMsg);
    return res.redirect(`/login?error=${encodeURIComponent(errorMsg as string)}`);
  }

  if (!code || typeof code !== 'string') {
    console.warn('No authorization code received. Query params:', req.query);
    return res.redirect('/auth/callback?error=No authorization code received');
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return res.redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    if (!data.session) {
      return res.redirect('/login?error=Failed to create session');
    }

    const redirectUrl = `/auth/callback?access_token=${encodeURIComponent(data.session.access_token)}&refresh_token=${encodeURIComponent(data.session.refresh_token)}&expires_at=${data.session.expires_at}`;
    return res.redirect(redirectUrl);
  } catch (error: any) {
    console.error('Unexpected error in OAuth callback:', error);
    return res.redirect(`/login?error=${encodeURIComponent(error.message || 'An unexpected error occurred')}`);
  }
}
