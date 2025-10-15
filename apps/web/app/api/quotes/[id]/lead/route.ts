import { NextRequest } from 'next/server'
import { z } from 'zod'

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend'
import { proxyFetch } from '@/app/api/_lib/proxyFetch'

const LeadSelectionSchema = z
  .object({
    lead_option_id: z.string().min(1, 'lead_option_id is required'),
    line_id: z.string().optional(),
  })
  .catchall(z.unknown())

const buildErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  })

const mapLeadTimeOption = (leadOptionId: string): 'standard' | 'expedited' => {
  const normalized = leadOptionId.trim().toLowerCase()
  if (normalized === 'expedited' || normalized === 'expedite') return 'expedited'
  if (normalized.includes('expedite') || normalized.includes('rush') || normalized.includes('fast')) {
    return 'expedited'
  }
  if (normalized === 'standard') return 'standard'
  return 'standard'
}

async function resolveTargetLineId(
  request: NextRequest,
  quoteId: string,
  candidate: string | undefined,
): Promise<string | Response> {
  if (candidate) {
    return candidate
  }

  const summaryUrl = new URL(resolveApiUrl(`/quotes/${encodeURIComponent(quoteId)}`))
  summaryUrl.searchParams.set('view', 'vnext')

  const upstream = await proxyFetch(request, summaryUrl, { method: 'GET' })
  if (!upstream.ok) {
    return buildProxyResponse(upstream)
  }

  try {
    const payload = await upstream.json()
    const fallback = Array.isArray(payload?.lines) ? payload.lines[0]?.id : undefined
    if (!fallback) {
      return buildErrorResponse('No quote lines available to update', 404)
    }
    return fallback
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse quote summary'
    return buildErrorResponse(message, 502)
  }
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  const quoteId = context.params.id
  let parsed: z.infer<typeof LeadSelectionSchema>

  try {
    const body = await request.json()
    parsed = LeadSelectionSchema.parse(body)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => issue.message).join('; ')
      return buildErrorResponse(issues)
    }
    return buildErrorResponse('Invalid JSON payload')
  }

  const targetLineResult = await resolveTargetLineId(request, quoteId, parsed.line_id)
  if (targetLineResult instanceof Response) {
    return targetLineResult
  }
  const lineId = targetLineResult

  const leadTimeOption = mapLeadTimeOption(parsed.lead_option_id)
  const patchUrl = resolveApiUrl(
    `/quotes/${encodeURIComponent(quoteId)}/parts/${encodeURIComponent(lineId)}/config`,
  )

  const patchResponse = await proxyFetch(request, patchUrl, {
    method: 'PATCH',
    body: JSON.stringify({ lead_time_option: leadTimeOption }),
    headers: { 'content-type': 'application/json' },
  })

  if (!patchResponse.ok) {
    return buildProxyResponse(patchResponse)
  }

  const summaryUrl = new URL(resolveApiUrl(`/quotes/${encodeURIComponent(quoteId)}`))
  summaryUrl.searchParams.set('view', 'vnext')
  const summaryResponse = await proxyFetch(request, summaryUrl, { method: 'GET' })
  return buildProxyResponse(summaryResponse)
}
