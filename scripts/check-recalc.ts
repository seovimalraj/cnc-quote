import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

interface PreviewResponse {
  eligibleCount: number;
  sampleQuoteIds?: string[];
  minCreatedAt?: string | null;
  maxCreatedAt?: string | null;
}

interface RunRow {
  id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'partial' | 'canceled';
  total_count?: number | null;
  success_count?: number | null;
  failed_count?: number | null;
  skipped_count?: number | null;
  error?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const apiUrl = process.env.API_URL || 'http://localhost:3001';
  const token = process.env.JWT_TOKEN;

  if (!token) {
    console.error('Error: JWT_TOKEN environment variable is required');
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  // 1) Preview to determine blast radius and guardrails
  let preview: PreviewResponse | null = null;
  try {
    const { data } = await axios.post<PreviewResponse>(`${apiUrl}/admin/pricing/recalc/preview`, {}, { headers });
    preview = data;
  } catch (error: any) {
    console.error('Preview request failed:', error.response?.status, error.response?.data || error.message);
    process.exit(1);
  }

  const eligible = preview?.eligibleCount ?? 0;
  console.log(`Recalc preview: eligible items=${eligible}`);
  if (preview?.sampleQuoteIds?.length) {
    console.log(`Sample quote IDs (first ${preview.sampleQuoteIds.length}):`, preview.sampleQuoteIds.slice(0, 10).join(', '));
  }
  if (preview?.minCreatedAt || preview?.maxCreatedAt) {
    console.log(`Created_at window: min=${preview?.minCreatedAt ?? 'n/a'} max=${preview?.maxCreatedAt ?? 'n/a'}`);
  }

  if (eligible === 0) {
    const out = {
      status: 'no_eligible_items',
      preview,
      at: new Date().toISOString(),
    };
    await writeArtifact(out);
    console.log('No eligible items found; exiting successfully.');
    process.exit(0);
  }

  // 2) Enqueue dry-run recalc
  let runId: string | null = null;
  try {
    const { data } = await axios.post<{ enqueued: boolean; runId: string }>(
      `${apiUrl}/admin/pricing/recalc`,
      { dryRun: true, reason: 'qa_smoke' },
      { headers }
    );
    runId = data?.runId ?? null;
  } catch (error: any) {
    console.error('Enqueue dry-run failed:', error.response?.status, error.response?.data || error.message);
    process.exit(1);
  }

  if (!runId) {
    console.error('Dry-run enqueue did not return a runId');
    process.exit(1);
  }

  // 3) Poll run until completion
  const deadline = Date.now() + 2 * 60 * 1000; // 2 minutes
  let finalRun: RunRow | null = null;
  while (Date.now() < deadline) {
    try {
      const { data } = await axios.get<{ run: RunRow; items: any[] }>(`${apiUrl}/admin/pricing/recalc-runs/${runId}`, { headers });
      const run = data?.run;
      if (run) {
        if ([ 'succeeded', 'failed', 'partial', 'canceled' ].includes(run.status)) {
          finalRun = run;
          break;
        }
      }
    } catch (error: any) {
      // keep polling on 404/500 briefly
    }
    await sleep(2000);
  }

  const result = {
    status: finalRun?.status ?? 'timeout',
    preview,
    run: finalRun,
    completed: Boolean(finalRun && [ 'succeeded', 'failed', 'partial', 'canceled' ].includes(finalRun.status)),
    at: new Date().toISOString(),
  };

  await writeArtifact(result);

  // For smoke, exit 0 even if partial/failed to allow non-blocking visibility in dev.
  if (!result.completed) {
    console.warn('Recalc smoke did not complete within timeout; exiting with 0 for non-blocking QA.');
  }
  process.exit(0);
}

async function writeArtifact(obj: any) {
  try {
    const artifactsDir = path.join(__dirname, '..', 'artifacts');
    await fs.mkdir(artifactsDir, { recursive: true });
    const file = path.join(artifactsDir, 'recalc-smoke.json');
    await fs.writeFile(file, JSON.stringify(obj, null, 2));
    console.log(`Wrote artifact: ${file}`);
  } catch (err) {
    console.warn('Failed to write artifact:', (err as Error).message);
  }
}

main().catch((err) => {
  console.error('check-recalc failed:', err);
  process.exit(1);
});
