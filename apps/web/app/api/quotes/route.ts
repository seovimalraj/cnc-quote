import { NextRequest } from 'next/server'
import { z } from 'zod'

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend'
import { proxyFetch } from '@/app/api/_lib/proxyFetch'

const FileInputSchema = z.object({
  fileId: z.string().min(1, 'fileId is required'),
  fileName: z.string().optional(),
  fileSize: z.number().int().nonnegative().optional(),
  contentType: z.string().optional(),
})

const CreateQuoteSchema = z
  .object({
    source: z.enum(['web', 'widget', 'large_order']).optional(),
    guestEmail: z
      .string()
      .regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, { message: 'guestEmail must be a valid email address' })
      .optional(),
    currency: z.string().optional(),
    files: z.array(FileInputSchema).min(1, 'At least one uploaded file is required'),
  })
  .catchall(z.unknown())

const mapFileToPart = (file: z.infer<typeof FileInputSchema>) => ({
  file_id: file.fileId,
  process_type: 'cnc_milling',
  material_id: 'best_available',
  finish_ids: [] as string[],
  quantities: [1],
  selected_quantity: 1,
  lead_time_option: 'standard',
  inspection_level: 'basic',
})

const buildErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })

export async function POST(request: NextRequest) {
  let parsed: z.infer<typeof CreateQuoteSchema>

  try {
    const body = await request.json()
    parsed = CreateQuoteSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => issue.message).join('; ')
      return buildErrorResponse(issues)
    }
    return buildErrorResponse('Invalid JSON payload')
  }

  const parts = parsed.files.map(mapFileToPart)

  if (parts.length === 0) {
    return buildErrorResponse('At least one file is required to create a quote')
  }

  const payload = {
    currency: parsed.currency ?? 'USD',
    parts,
    source: parsed.source,
    guestEmail: parsed.guestEmail,
  }

  // API controller is mounted at /api/quotes on the backend
  const upstream = await proxyFetch(request, resolveApiUrl('/api/quotes'), {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'content-type': 'application/json' },
  })

  return buildProxyResponse(upstream)
}
