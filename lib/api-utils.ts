import { NextResponse } from 'next/server';

export type ApiErrorResponse = {
  error: string;
  message: string;
  details?: any;
  code?: string;
};

export function createErrorResponse(
  message: string,
  status: number = 500,
  error: string = 'Internal Server Error',
  details?: any,
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

export function createSuccessResponse(data: any, status: number = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

// For standard Next.js API routes (not Edge)
export function sendError(
  res: any,
  message: string,
  status: number = 500,
  error: string = 'Internal Server Error',
  details?: any,
  code?: string
) {
  const body: ApiErrorResponse = { error, message };
  if (details) body.details = details;
  if (code) body.code = code;

  return res.status(status).json(body);
}
