import { NextResponse } from 'next/server';
import type { NextApiResponse } from 'next';

export type ApiErrorResponse = {
  error: string;
  message: string;
  details?: unknown;
  code?: string;
};

export function createErrorResponse(
  message: string,
  status: number = 500,
  error: string = 'Internal Server Error',
  details?: unknown,
  code?: string
) {
  const body: ApiErrorResponse = { error, message };
  if (details) body.details = details;
  if (code) body.code = code;

  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function createSuccessResponse(data: unknown, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// For standard Next.js API routes (not Edge)
export function sendError(
  res: NextApiResponse,
  message: string,
  status: number = 500,
  error: string = 'Internal Server Error',
  details?: unknown,
  code?: string
) {
  const body: ApiErrorResponse = { error, message };
  if (details) body.details = details;
  if (code) body.code = code;

  return res.status(status).json(body);
}
