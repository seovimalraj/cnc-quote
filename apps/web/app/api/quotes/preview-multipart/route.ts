import { NextRequest } from 'next/server'
import { z } from 'zod'

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend'
import { proxyFetch } from '@/app/api/_lib/proxyFetch'

const PartSchema = z
  .object({
    process_code: z.string().min(1, 'process_code is required'),
    material_code: z.string().min(1, 'material_code is required'),
    quantity: z.number().int().positive('quantity must be positive'),
    external_id: z.string().optional(),
    finish_codes: z.array(z.string()).optional(),
    quantities: z.array(z.number()).optional(),
    dfm_risk_score: z.number().min(0).max(1).optional(),
    volume_cc: z.number().nonnegative().optional(),
    surface_area_cm2: z.number().nonnegative().optional(),
    removed_material_cc: z.number().nonnegative().optional(),
    features: z
      .object({
        holes: z.number().int().nonnegative().optional(),
        pockets: z.number().int().nonnegative().optional(),
        slots: z.number().int().nonnegative().optional(),
        faces: z.number().int().nonnegative().optional(),
      })
      .partial()
      .optional(),
    sheet: z
      .object({
        thickness_mm: z.number().nonnegative().optional(),
        area_cm2: z.number().nonnegative().optional(),
        cut_length_mm: z.number().nonnegative().optional(),
        bends: z.number().int().nonnegative().optional(),
        pierces: z.number().int().nonnegative().optional(),
      })
      .partial()
      .optional(),
    molding: z
      .object({
        part_volume_cc: z.number().nonnegative().optional(),
        cycle_time_s: z.number().nonnegative().optional(),
        cavity_count: z.number().int().positive().optional(),
      })
      .partial()
      .optional(),
  })
  .catchall(z.unknown())

const PreviewRequestSchema = z
  .object({
    currency: z.string().optional(),
    parts: z.array(PartSchema).min(1, 'At least one part is required'),
  })
  .catchall(z.unknown())

const buildErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })

export async function POST(request: NextRequest) {
  let parsed: z.infer<typeof PreviewRequestSchema>

  try {
    const body = await request.json()
    parsed = PreviewRequestSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => issue.message).join('; ')
      return buildErrorResponse(issues)
    }
    return buildErrorResponse('Invalid JSON payload')
  }

  const upstream = await proxyFetch(request, resolveApiUrl('/quotes/preview-multipart'), {
    method: 'POST',
    body: JSON.stringify(parsed),
    headers: { 'content-type': 'application/json' },
  })

  return buildProxyResponse(upstream)
}
