import React, { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const fetcherText = (url: string) => fetch(url).then(r => r.text());
const fetcherJson = (url: string) => fetch(url).then(r => r.json());

function parsePromLines(text: string) {
  const lines = text.split('\n');
  const wanted = ['quote_status_transition_total', 'queue_oldest_job_age_seconds', 'queue_failed_24h'];
  return lines.filter(l => wanted.some(w => l.startsWith(w)));
}

export default function AdminMetricsPage() {
  const { data: promRaw } = useSWR('/metrics', fetcherText, { refreshInterval: 20000 });
  const { data: slo } = useSWR('/api/admin/metrics/slo', fetcherJson, { refreshInterval: 30000 });
  const { data: db } = useSWR('/api/admin/metrics/db', fetcherJson, { refreshInterval: 45000 });

  const promLines = promRaw ? parsePromLines(promRaw) : [];

  // Simple in-memory spark data for placeholder (will be replaced by websocket feed later)
  const [sparkData, setSparkData] = useState<number[]>([]);
  useEffect(() => {
    const id = setInterval(() => {
      setSparkData(d => {
        const next = [...d, (slo?.first_price_p95_ms || 0) + Math.random()*50 - 25];
        return next.slice(-60);
      });
    }, 5000);
    return () => clearInterval(id);
  }, [slo?.first_price_p95_ms]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Metrics & SLOs</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">First Price P95</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{slo?.first_price_p95_ms ?? '--'}<span className="text-xs ml-1">ms</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">CAD Proc P95</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{slo?.cad_p95_ms ?? '--'}<span className="text-xs ml-1">ms</span></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Oldest Job Age</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">{slo?.oldest_job_age_sec ?? '--'}<span className="text-xs ml-1">s</span></CardContent></Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">First Price P95 Sparkline (Preview)</CardTitle></CardHeader>
        <CardContent>
          <Sparkline data={sparkData} height={40} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Selected Prometheus Metrics</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs whitespace-pre-wrap max-h-96 overflow-auto bg-gray-900 text-green-300 p-4 rounded">{promLines.join('\n') || 'Loading...'}</pre>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Database Latency (Mock)</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div><div className="text-gray-500">Read P95</div><div className="font-semibold">{db?.read_p95_ms ?? '--'} ms</div></div>
            <div><div className="text-gray-500">Write P95</div><div className="font-semibold">{db?.write_p95_ms ?? '--'} ms</div></div>
            <div><div className="text-gray-500">Error Rate</div><div className="font-semibold">{db?.error_rate_pct ?? '--'}%</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Sparkline({ data, height = 40 }: { readonly data: readonly number[]; readonly height?: number }) {
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
    <svg ref={ref} width={w} height={h} className="overflow-visible">
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
