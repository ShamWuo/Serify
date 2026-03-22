import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).send('Missing token');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, is_map_public, id')
    .eq('share_token', token)
    .single();

  if (!profile || !profile.is_map_public) {
    return res.status(404).send('Not found');
  }

  const { count } = await supabase
    .from('knowledge_nodes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id);

  const nodeCount = count || 0;

  const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Neural-like background pattern -->
  <circle cx="600" cy="315" r="400" fill="none" stroke="#3b82f6" stroke-width="1" opacity="0.1"/>
  <circle cx="600" cy="315" r="300" fill="none" stroke="#3b82f6" stroke-width="1" opacity="0.1"/>
  <circle cx="600" cy="315" r="200" fill="none" stroke="#3b82f6" stroke-width="1" opacity="0.1"/>
  
  <line x1="200" y1="100" x2="1000" y2="530" stroke="#3b82f6" stroke-width="0.5" opacity="0.1"/>
  <line x1="1000" y1="100" x2="200" y2="530" stroke="#3b82f6" stroke-width="0.5" opacity="0.1"/>

  <!-- Branding -->
  <g transform="translate(100, 80)">
    <text font-family="sans-serif" font-size="28" font-weight="800" fill="#3b82f6" letter-spacing="4">SERIFY</text>
    <text y="25" font-family="sans-serif" font-size="14" fill="#64748b" letter-spacing="1">MASTERY MAP</text>
  </g>

  <!-- Content -->
  <g transform="translate(100, 250)">
    <text font-family="sans-serif" font-size="56" font-weight="700" fill="white" letter-spacing="-1">
      ${profile.display_name.replace(/&/g, '&amp;')}'s Learning Universe
    </text>
    <text y="60" font-family="sans-serif" font-size="24" fill="#94a3b8">
      Currently tracking ${nodeCount} core concepts with Serify.
    </text>
  </g>

  <!-- Map Visual Decoration -->
  <circle cx="950" cy="315" r="120" fill="url(#accent)" opacity="0.2"/>
  <circle cx="950" cy="315" r="60" fill="url(#accent)" opacity="0.4"/>
  <circle cx="950" cy="315" r="10" fill="white"/>

  <!-- Footer CTA -->
  <rect x="100" y="520" width="1000" height="1" fill="#334155"/>
  <text x="100" y="560" font-family="sans-serif" font-size="18" fill="#64748b">
    Visualize your knowledge. Build your neural map at serify.io
  </text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
  res.status(200).send(svg);
}
