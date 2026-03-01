import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Returns a dynamic SVG-based OG image for a shared Serify session
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).send('Missing sessionId');
    }

    const { data: session } = await supabase
        .from('reflection_sessions')
        .select('title, depth_score, is_public')
        .eq('id', sessionId)
        .single();

    if (!session || !session.is_public) {
        return res.status(404).send('Not found');
    }

    const title = session.title || 'A Serify Session';
    const depthScore = session.depth_score ?? null;

    // Truncate title for display
    const displayTitle = title.length > 48 ? title.slice(0, 45) + '...' : title;

    // Color palette for the score gradient
    const scoreColor =
        depthScore === null
            ? '#6b7280'
            : depthScore >= 75
                ? '#16a34a'
                : depthScore >= 50
                    ? '#2563eb'
                    : '#d97706';

    const scoreText = depthScore !== null ? `${depthScore}` : '—';

    const svg = `
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#faf9f7"/>
      <stop offset="100%" stop-color="#f0ede8"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#2d6a4f"/>
      <stop offset="100%" stop-color="#1b4332"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Decorative circle top right -->
  <circle cx="1100" cy="-50" r="280" fill="#2d6a4f" opacity="0.06"/>
  <circle cx="1150" cy="600" r="200" fill="#2d6a4f" opacity="0.04"/>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="8" height="630" fill="url(#accent)"/>

  <!-- Serify Logo / Brand -->
  <text x="72" y="80" font-family="Georgia, serif" font-size="26" font-weight="700" fill="#2d6a4f" letter-spacing="2">SERIFY</text>
  <text x="72" y="105" font-family="-apple-system, sans-serif" font-size="14" fill="#6b7280" letter-spacing="0.5">Diagnostic Learning</text>

  <!-- Divider -->
  <line x1="72" y1="135" x2="1128" y2="135" stroke="#e5e0d8" stroke-width="1"/>

  <!-- Session Title -->
  <text x="72" y="230" font-family="Georgia, serif" font-size="46" font-weight="700" fill="#1a1a1a" letter-spacing="-0.5">
    ${displayTitle.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}
  </text>

  <!-- Subtext -->
  <text x="72" y="290" font-family="-apple-system, sans-serif" font-size="22" fill="#6b7280">
    Serify exposed the gaps in my understanding.
  </text>

  <!-- Depth Score Card -->
  <rect x="72" y="350" width="260" height="140" rx="16" fill="white" filter="drop-shadow(0 4px 16px rgba(0,0,0,0.06))"/>
  <text x="152" y="410" font-family="-apple-system, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">DEPTH SCORE</text>
  <text x="152" y="470" font-family="Georgia, serif" font-size="56" font-weight="700" fill="${scoreColor}" text-anchor="middle">${scoreText}</text>

  <!-- CTA Banner -->
  <rect x="72" y="540" width="820" height="55" rx="12" fill="#1b4332"/>
  <text x="482" y="575" font-family="-apple-system, sans-serif" font-size="20" fill="white" text-anchor="middle">
    What will Serify find in your notes? Get 15 free Sparks → serify.io
  </text>
</svg>`;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
    res.status(200).send(svg);
}
