import { NextRequest } from 'next/server';

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

const numberOrDash = (value: unknown): string => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value.toString();
  }
  return 'n/a';
};

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const windowLabel = typeof payload.window === 'string' && payload.window.length ? payload.window : '1h';

  const reviewSummary = payload.review ?? {};
  const queueSummary = payload.queues ?? {};
  const webhookSummary = payload.webhooks ?? {};
  const sloSummary = payload.slo ?? {};
  const dbSummary = payload.db ?? {};
  const errorSummary = payload.errors ?? {};

  const message = [
    'You are an on-call CNC operations assistant. Provide concise, actionable insights. ',
    `Observation window: ${windowLabel}.`,
    '\nReview backlog:',
    `• open: ${numberOrDash(reviewSummary.count)} | new: ${numberOrDash(reviewSummary.new_count)} | aging: ${numberOrDash(reviewSummary.aging_count)} | breached: ${numberOrDash(reviewSummary.breached_count)}`,
    '\nQueue health:',
    Array.isArray(queueSummary.queues)
      ? queueSummary.queues
          .slice(0, 5)
          .map((q: any) => `• ${q.name}: waiting=${numberOrDash(q.waiting)}, failed24h=${numberOrDash(q.failed_24h)}, oldest=${numberOrDash(q.oldest_job_age_sec)}s`)
          .join('\n') || '• no queues reported'
      : '• no queues reported',
    '\nWebhook status:',
    Array.isArray(webhookSummary.items)
      ? webhookSummary.items
          .map((item: any) => `• ${item.provider}: status=${item.status}, failed24h=${numberOrDash(item.failed_24h)}`)
          .join('\n') || '• no webhooks'
      : '• no webhooks',
    '\nSLO snapshot:',
    `• first_price_p95_ms=${numberOrDash(sloSummary.first_price_p95_ms)} | cad_p95_ms=${numberOrDash(sloSummary.cad_p95_ms)} | oldest_job_age_sec=${numberOrDash(sloSummary.oldest_job_age_sec)}`,
    '\nDB latency:',
    `• read_p95_ms=${numberOrDash(dbSummary.read_p95_ms)} | write_p95_ms=${numberOrDash(dbSummary.write_p95_ms)} | error_rate_pct=${numberOrDash(dbSummary.error_rate_pct)}`,
    '\nErrors:',
    Array.isArray(errorSummary.failed_jobs)
      ? `• failed_jobs=${errorSummary.failed_jobs.length}`
      : '• failed_jobs unavailable',
    Array.isArray(errorSummary.sentry)
      ? `• sentry_events=${errorSummary.sentry.length}`
      : '',
    '\nRespond with: 1) top three insights (with metric references), 2) prioritized action checklist (include owners if inferable), 3) warnings requiring escalation. Keep it under 180 words. Use markdown bullets.',
  ]
    .filter(Boolean)
    .join(' ');

  const upstream = await proxyFetch(request, resolveApiUrl('/ai/chat'), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message,
      context: {
        source: 'admin-operations-insight',
      },
    }),
  });

  return buildProxyResponse(upstream);
}
