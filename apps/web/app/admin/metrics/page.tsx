'use client';

import React, { useMemo, useRef } from 'react';
import useSWR from 'swr';
import { ContractsVNext } from '@cnc-quote/shared';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * @module AdminMetricsPage
 * Renders the admin metrics dashboard using live SLO and DB latency snapshots sourced from the API proxy routes.
 * Validates payloads against shared contracts to guarantee deterministic observability rendering across refresh cycles.
 */

const fetcherText = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.text();
};

const fetcherJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
};

function parsePromLines(text: string) {
  const lines = text.split('\n');
  const wanted = ['quote_status_transition_total', 'queue_oldest_job_age_seconds', 'queue_failed_24h'];
  return lines.filter(l => wanted.some(w => l.startsWith(w)));
}

const formatTimestamp = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const formatNumber = (value?: number | null, unit?: string) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  const formatted = value >= 1000 ? Math.round(value) : Math.round(value * 100) / 100;
  return unit ? `${formatted} ${unit}` : `${formatted}`;
};

const toSparkData = (slo?: ContractsVNext.AdminSloSnapshot) => {
  if (!slo?.samples?.length) return [] as number[];
  return slo.samples
    .map((sample) => sample.first_price_ms ?? null)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
};

const resolveDbSeries = (snapshot?: ContractsVNext.AdminDbLatencySnapshot) => {
  if (!snapshot?.samples?.length) {
    return { read: [], write: [] };
  }
  const read = snapshot.samples
    .map((sample) => sample.read_ms ?? null)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  const write = snapshot.samples
    .map((sample) => sample.write_ms ?? null)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

  return { read, write };
};

export default function AdminMetricsPage() {
  const { data: promRaw } = useSWR('/metrics', fetcherText, { refreshInterval: 20000 });
  const { data: slo } = useSWR<ContractsVNext.AdminSloSnapshot>('/api/admin/metrics/slo', fetcherJson, {
    refreshInterval: 30000,
  });
  const { data: db } = useSWR<ContractsVNext.AdminDbLatencySnapshot>('/api/admin/metrics/db', fetcherJson, {
    refreshInterval: 45000,
  });

  const promLines = promRaw ? parsePromLines(promRaw) : [];
  const sparkData = useMemo(() => toSparkData(slo), [slo]);
  const dbSeries = useMemo(() => resolveDbSeries(db), [db]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Metrics &amp; SLOs</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricTile title="First Price P95" value={formatNumber(slo?.first_price_p95_ms, 'ms')} observedAt={slo?.observed_at} />
        <MetricTile title="CAD Proc P95" value={formatNumber(slo?.cad_p95_ms, 'ms')} observedAt={slo?.observed_at} />
        <MetricTile title="Oldest Job Age" value={formatNumber(slo?.oldest_job_age_sec, 's')} observedAt={slo?.observed_at} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Time To First Price (validated)</CardTitle></CardHeader>
        <CardContent>
          <Sparkline data={sparkData} height={40} />
          <SecondaryLine label="Samples" value={sparkData.length ? `${sparkData.length} points` : 'No samples captured'} />
          {slo?.missing_metrics?.length ? (
            <MissingMetrics title="SLO sources missing" items={slo.missing_metrics} />
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Selected Prometheus Metrics</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap max-h-96 overflow-auto bg-gray-900 text-green-300 p-4 rounded">{promLines.join('\n') || 'Loading...'}</pre>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Database Latency Snapshot</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <MetricPair label="Read P95" value={formatNumber(db?.read_p95_ms, 'ms')} />
            <MetricPair label="Write P95" value={formatNumber(db?.write_p95_ms, 'ms')} />
            <MetricPair label="Error Rate" value={formatNumber(db?.error_rate_pct, '%')} />
            <MetricPair label="Observed" value={formatTimestamp(db?.observed_at)} />
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Sparkline label="Read latency" data={dbSeries.read} height={50} />
            <Sparkline label="Write latency" data={dbSeries.write} height={50} />
          </div>
          {db?.missing_metrics?.length ? (
            <MissingMetrics title="DB sources missing" items={db.missing_metrics} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricTile({ title, value, observedAt }: { title: string; value: string; observedAt?: string | null }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {title}
          {observedAt ? <Badge variant="outline" className="text-[10px]">{formatTimestamp(observedAt)}</Badge> : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-2xl font-semibold">{value}</CardContent>
    </Card>
  );
}

function MetricPair({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-gray-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function SecondaryLine({ label, value }: { label: string; value: string }) {
  return <div className="mt-3 text-xs text-gray-500">{label}: <span className="text-gray-900">{value}</span></div>;
}

function MissingMetrics({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-800">{title}</p>
      <ul className="mt-2 list-disc list-inside text-xs text-amber-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Sparkline({ data, height = 40, label }: { readonly data: readonly number[]; readonly height?: number; readonly label?: string }) {
  const ref = useRef<SVGSVGElement | null>(null);
  if (!data.length) return <div className="text-xs text-gray-500">Collecting data…</div>;
  const w = 300;
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 4) + 2;
    const y = h - 2 - ((v - min) / span) * (h - 4);
    return `${x},${y}`;
  }).join(' ');
  return (
    <div>
      {label ? <div className="mb-1 text-xs text-gray-500">{label}</div> : null}
      <svg ref={ref} width={w} height={h} className="overflow-visible">
        <polyline points={points} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
}
