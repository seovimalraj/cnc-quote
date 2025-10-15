import { NextRequest } from 'next/server';
import { z } from 'zod';

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const e164Regex = /^\+[1-9]\d{6,14}$/;

const LeadRequestSchema = z
  .object({
    email: z.string().regex(emailRegex, { message: 'email must be a valid address' }),
    phone: z.string().regex(e164Regex, { message: 'phone must be formatted as E.164' }),
    dfm_request_id: z.string().min(1).optional(),
  })
  .catchall(z.unknown());

const buildErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

export async function POST(request: NextRequest) {
  let parsed: z.infer<typeof LeadRequestSchema>;

  try {
    const body = await request.json();
    parsed = LeadRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => issue.message).join('; ');
      return buildErrorResponse(issues);
    }
    return buildErrorResponse('Invalid JSON payload');
  }

  const payload = {
    email: parsed.email,
    phone: parsed.phone,
    ...(parsed.dfm_request_id ? { dfm_request_id: parsed.dfm_request_id } : {}),
  };

  const upstream = await proxyFetch(request, resolveApiUrl('/leads'), {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  });

  return buildProxyResponse(upstream);
}
