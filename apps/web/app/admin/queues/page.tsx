import React from 'react';
import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQueueStatusSocket } from '@/hooks/useQueueStatusSocket';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function AdminQueuesPage() {
  const { data, error, mutate, isLoading } = useSWR('/api/admin/queues/status', fetcher, { refreshInterval: 60000 });
  const { snapshot, connected } = useQueueStatusSocket(data);
  const queues = snapshot?.queues || data?.queues || [];

  async function retry(queue: string) {
    await fetch(`/api/admin/queues/${queue}/retry-failed`, { method: 'POST' });
    mutate();
  }

  return (
    <RequireAnyRole roles={['admin','org_admin','reviewer']} fallback={<div className="text-sm text-red-600">Access denied</div>}>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Queue Monitor</h1>
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${connected ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span>
            {connected ? 'live' : 'offline'}
          </span>
        </div>
        <Button variant="outline" onClick={() => mutate()}>Manual Refresh</Button>
      </div>
      {error && <div className="text-sm text-red-600">Failed to load queue status</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {queues.map((q: any) => (
          <Card key={q.name} className="relative">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center justify-between">
                <span>{q.name}</span>
                <span className="text-xs font-normal text-gray-500">age {q.oldest_job_age_sec}s</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-2">
              <div className="flex justify-between"><span>Waiting</span><span className="font-semibold">{q.waiting}</span></div>
              <div className="flex justify-between"><span>Active</span><span className="font-semibold">{q.active}</span></div>
              <div className="flex justify-between"><span>Delayed</span><span className="font-semibold">{q.delayed}</span></div>
              <div className="flex justify-between"><span>Failed 24h</span><span className="font-semibold text-red-600">{q.failed_24h}</span></div>
              <div className="pt-2 flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => retry(q.name.split(':')[0] + ':' + q.name.split(':')[1])}>Retry Failed</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {isLoading && queues.length === 0 && (
          <Card><CardContent className="p-6 text-sm text-gray-500">Loading queues...</CardContent></Card>
        )}
      </div>
    </div>
    </RequireAnyRole>
  );
}
