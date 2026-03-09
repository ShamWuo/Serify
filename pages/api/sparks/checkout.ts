import type { NextApiRequest, NextApiResponse } from 'next';

// This endpoint is retired. Use /api/billing/buy-sparks for Spark purchases.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
    res.status(410).json({ error: 'Gone. Use /api/billing/buy-sparks.' });
}
