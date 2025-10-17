'use client';

/**
 * @module AdminWorkcenterPage
 * Translates live operational signals (manual review load, queue depth, and SLO health) into an admin-facing dashboard.
 * Pulls deterministic data via Next.js API proxies that validate against shared contracts before rendering.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { ContractsVNext } from '@cnc-quote/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  TrashIcon,
  EyeIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import { trackEvent } from '@/lib/analytics/posthog';

const fetcherJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json();
};

const formatCurrency = (value?: number | null, currency?: string | null) => {
  if (value === null || value === undefined) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency ?? 'USD',
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(value >= 1000 ? 0 : 2)}`;
  }
};

const formatAgeLabel = (minutes?: number) => {
  if (minutes === undefined || minutes === null || Number.isNaN(minutes)) {
    return '—';
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`;
};

const formatLatencyMs = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value)} ms`;
};

const formatSeconds = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value)} s`;
};

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  return `${Math.round(value * 100) / 100}%`;
};

// Time range options
const TIME_RANGES = [
  { value: '15m', label: 'Last 15m' },
  { value: '1h', label: 'Last 1h' },
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7d' }
];

// Environment badge component
const EnvironmentBadge = ({ env }: { env: string }) => {
  const colors = {
    'Dev': 'bg-blue-100 text-blue-800',
    'Staging': 'bg-yellow-100 text-yellow-800',
    'Prod': 'bg-green-100 text-green-800'
  };

  return (
    <Badge className={colors[env as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
      {env}
    </Badge>
  );
};

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const colors = {
    'OK': 'bg-green-100 text-green-800',
    'WARN': 'bg-yellow-100 text-yellow-800',
    'FAIL': 'bg-red-100 text-red-800',
    'CRITICAL': 'bg-red-100 text-red-800'
  };

  return (
    <Badge className={colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}>
      {status}
    </Badge>
  );
};

export default function WorkcenterDashboardPage() {
  const [timeRange, setTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const {
    data: reviewSummary,
    isLoading: reviewLoading,
    isValidating: reviewValidating,
    mutate: mutateReviewSummary,
  } = useSWR(
    ['admin-review-summary', timeRange],
    ([, window]) => fetcherJson<ContractsVNext.AdminReviewSummarySnapshotVNext>(`/api/admin/review/summary?window=${window}`),
    {
      refreshInterval: autoRefresh ? 30000 : 0,
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const {
    data: queueStatus,
    isValidating: queueValidating,
    mutate: mutateQueueStatus,
  } = useSWR(
    ['admin-queue-status', timeRange],
    ([, window]) => fetcherJson<ContractsVNext.AdminQueueSnapshotVNext>(`/api/admin/queues/status?window=${window}`),
    {
      refreshInterval: autoRefresh ? 25000 : 0,
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const {
    data: webhookStatus,
    isValidating: webhookValidating,
    mutate: mutateWebhookStatus,
  } = useSWR(
    ['admin-webhook-status', timeRange],
    ([, window]) => fetcherJson<ContractsVNext.AdminWebhookStatusSnapshotVNext>(`/api/admin/webhooks/status?window=${window}`),
    {
      refreshInterval: autoRefresh ? 40000 : 0,
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const {
    data: errorSnapshot,
    isValidating: errorValidating,
    mutate: mutateErrorSnapshot,
  } = useSWR(
    ['admin-error-snapshot', timeRange],
    ([, window]) => fetcherJson<ContractsVNext.AdminErrorSnapshotVNext>(`/api/admin/errors?window=${window}`),
    {
      refreshInterval: autoRefresh ? 45000 : 0,
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const {
    data: sloSnapshotData,
    isValidating: sloValidating,
    mutate: mutateSloSnapshot,
  } = useSWR(
    ['admin-slo-snapshot', timeRange],
    ([, window]) => fetcherJson<ContractsVNext.AdminSloSnapshotVNext>(`/api/admin/metrics/slo?window=${window}`),
    {
      refreshInterval: autoRefresh ? 40000 : 0,
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const {
    data: dbLatencySnapshotData,
    isValidating: dbValidating,
    mutate: mutateDbLatencySnapshot,
  } = useSWR(
    ['admin-db-latency-snapshot', timeRange],
    ([, window]) => fetcherJson<ContractsVNext.AdminDbLatencySnapshotVNext>(`/api/admin/metrics/db?window=${window}`),
    {
      refreshInterval: autoRefresh ? 60000 : 0,
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  );

  const fallbackOpenReviews = useMemo<ContractsVNext.AdminReviewSummarySnapshotVNext>(() => ({
    window: timeRange,
    count: 0,
    new_count: 0,
    aging_count: 0,
    breached_count: 0,
    evaluated_at: new Date().toISOString(),
    items: [],
  }), [timeRange]);

  const openReviews = reviewSummary ?? fallbackOpenReviews;

  const fallbackQueueSnapshot = useMemo<ContractsVNext.AdminQueueSnapshotVNext>(() => ({
    window: timeRange,
    evaluated_at: new Date().toISOString(),
    queues: [],
  }), [timeRange]);

  const queueSnapshot = queueStatus ?? fallbackQueueSnapshot;

  const fallbackWebhookSnapshot = useMemo<ContractsVNext.AdminWebhookStatusSnapshotVNext>(() => ({
    window: timeRange,
    evaluated_at: new Date().toISOString(),
    items: [],
  }), [timeRange]);

  const webhookSnapshot = webhookStatus ?? fallbackWebhookSnapshot;

  const fallbackErrorSnapshot = useMemo<ContractsVNext.AdminErrorSnapshotVNext>(() => ({
    window: timeRange,
    evaluated_at: new Date().toISOString(),
    sentry: [],
    failed_jobs: [],
  }), [timeRange]);

  const errors = errorSnapshot ?? fallbackErrorSnapshot;

  const fallbackSloSnapshot = useMemo<ContractsVNext.AdminSloSnapshotVNext>(() => ({
    window: timeRange,
    observed_at: null,
    first_price_p95_ms: null,
    cad_p95_ms: null,
    payment_to_order_p95_ms: null,
    oldest_job_age_sec: null,
    samples: [],
  }), [timeRange]);

  const sloSnapshot = sloSnapshotData ?? fallbackSloSnapshot;

  const fallbackDbLatencySnapshot = useMemo<ContractsVNext.AdminDbLatencySnapshotVNext>(() => ({
    window: timeRange,
    observed_at: null,
    read_p95_ms: null,
    write_p95_ms: null,
    error_rate_pct: null,
    samples: [],
  }), [timeRange]);

  const dbLatencySnapshot = dbLatencySnapshotData ?? fallbackDbLatencySnapshot;

  const dbReadSeries = useMemo(() => {
    return (dbLatencySnapshot.samples ?? [])
      .map((sample) => sample.read_ms ?? null)
      .filter((value): value is number => value !== null && Number.isFinite(value));
  }, [dbLatencySnapshot]);

  const dbWriteSeries = useMemo(() => {
    return (dbLatencySnapshot.samples ?? [])
      .map((sample) => sample.write_ms ?? null)
      .filter((value): value is number => value !== null && Number.isFinite(value));
  }, [dbLatencySnapshot]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    trackEvent('workcenter_refresh');

    try {
      await Promise.all([
        mutateReviewSummary(),
        mutateQueueStatus(),
        mutateWebhookStatus(),
        mutateErrorSnapshot(),
        mutateSloSnapshot(),
        mutateDbLatencySnapshot(),
      ]);
    } catch (error) {
      trackEvent('workcenter_refresh_failed', {
        message: error instanceof Error ? error.message : 'unknown error',
      });
    } finally {
      setLastRefresh(new Date());
      setRefreshing(false);
    }
  }, [mutateReviewSummary, mutateQueueStatus, mutateWebhookStatus, mutateErrorSnapshot, mutateSloSnapshot, mutateDbLatencySnapshot]);

  const handleRetryFailed = useCallback(async (queueName: string) => {
    trackEvent('workcenter_retry_failed', { queue: queueName });
    try {
      const response = await fetch(`/api/admin/queues/${encodeURIComponent(queueName)}/retry-failed`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Retry failed jobs responded with ${response.status}`);
      }
      await Promise.all([mutateQueueStatus(), mutateErrorSnapshot()]);
    } catch (error) {
      trackEvent('workcenter_retry_failed_error', {
        queue: queueName,
        message: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }, [mutateQueueStatus, mutateErrorSnapshot]);

  const handleCleanCompleted = useCallback(async (queueName: string) => {
    trackEvent('workcenter_clean_completed', { queue: queueName });
    try {
      const response = await fetch(`/api/admin/queues/${encodeURIComponent(queueName)}/clean-completed`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Clean completed jobs responded with ${response.status}`);
      }
      await mutateQueueStatus();
    } catch (error) {
      trackEvent('workcenter_clean_completed_error', {
        queue: queueName,
        message: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }, [mutateQueueStatus]);

  const handleWebhookReplay = useCallback(async (provider: string) => {
    const providerKey = provider.toLowerCase();
    trackEvent(`webhook_replay_${providerKey}`);
    try {
      const response = await fetch(`/api/admin/webhooks/${encodeURIComponent(providerKey)}/replay`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Webhook replay responded with ${response.status}`);
      }
      await mutateWebhookStatus();
    } catch (error) {
      trackEvent('webhook_replay_error', {
        provider: providerKey,
        message: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }, [mutateWebhookStatus]);

  const handleRetryJob = useCallback(async (queue: string, jobId: string) => {
    trackEvent('workcenter_retry_one', { queue, jobId });
    try {
      const params = new URLSearchParams({ queue });
      const response = await fetch(`/api/admin/queues/jobs/${encodeURIComponent(jobId)}/retry?${params.toString()}`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(`Retry job responded with ${response.status}`);
      }
      await Promise.all([mutateErrorSnapshot(), mutateQueueStatus()]);
    } catch (error) {
      trackEvent('workcenter_retry_one_error', {
        queue,
        jobId,
        message: error instanceof Error ? error.message : 'unknown error',
      });
    }
  }, [mutateErrorSnapshot, mutateQueueStatus]);

  useEffect(() => {
    const timestamps = [
      reviewSummary?.evaluated_at,
      queueSnapshot?.evaluated_at,
      webhookSnapshot?.evaluated_at,
      errors?.evaluated_at,
      sloSnapshot?.observed_at ?? null,
      dbLatencySnapshot?.observed_at ?? null,
    ].filter((value): value is string => Boolean(value));

    if (timestamps.length) {
      const latest = new Date(Math.max(...timestamps.map((value) => Date.parse(value))));
      setLastRefresh(latest);
    }
  }, [reviewSummary, queueSnapshot, webhookSnapshot, errors, sloSnapshot, dbLatencySnapshot]);

  useEffect(() => {
    trackEvent('workcenter_load');
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, handleRefresh]);

  const getSLOTileColor = (value: number | null | undefined, target: number, warningThreshold?: number) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return 'bg-gray-100 text-gray-600';
    }
    if (value <= target) return 'bg-green-100 text-green-800';
    if (warningThreshold && value <= warningThreshold) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const resolveSloBadge = (value: number | null | undefined, target: number, warningThreshold?: number) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return '?';
    }
    if (value <= target) return '✓';
    if (warningThreshold && value <= warningThreshold) return '⚠';
    return '✗';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">Workcenter Dashboard</h1>
              <EnvironmentBadge env="Prod" />
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map(range => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </span>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={autoRefresh}
                  onCheckedChange={setAutoRefresh}
                  id="auto-refresh"
                />
                <label htmlFor="auto-refresh" className="text-sm text-gray-600">
                  Auto-refresh
                </label>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                <ArrowPathIcon className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="ghost" size="sm">
                <QuestionMarkCircleIcon className="w-4 h-4 mr-2" />
                Help
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Alerts */}
        {openReviews.breached_count > 0 && (
          <Alert className="mb-6">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              Manual review SLA breached for {openReviews.breached_count} quotes.
            </AlertDescription>
          </Alert>
        )}

        {/* Row 1: Open Reviews, Queue Depth, DB Latency, Webhook Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
          {/* Open Reviews Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Open Reviews</CardTitle>
              <p className="text-sm text-gray-600">SLA: respond &lt; 4h</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-3xl font-bold">{openReviews.count}</div>

                <div className="flex space-x-2">
                  <Badge className="bg-green-100 text-green-800">
                    {openReviews.new_count} New (&lt;1h)
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {openReviews.aging_count} Aging (1–4h)
                  </Badge>
                  <Badge className="bg-red-100 text-red-800">
                    {openReviews.breached_count} Breached (&gt;4h)
                  </Badge>
                </div>

                <div className="space-y-2">
                  <Button size="sm" className="w-full">
                    Open Queue
                  </Button>
                  <Button size="sm" variant="outline" className="w-full">
                    Oldest First
                  </Button>
                </div>

                {/* Table Preview */}
                <div className="border rounded">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Quote ID</TableHead>
                        <TableHead className="text-xs">Org</TableHead>
                        <TableHead className="text-xs">Value</TableHead>
                        <TableHead className="text-xs">Age</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openReviews.items.length ? (
                        openReviews.items.slice(0, 3).map((item) => (
                          <TableRow
                            key={item.quote_id}
                            className={`cursor-pointer hover:bg-gray-50 ${item.breached ? 'border-l-2 border-l-red-400' : ''}`}
                          >
                            <TableCell className="text-xs font-mono">{item.quote_id}</TableCell>
                            <TableCell className="text-xs">{item.org ?? '—'}</TableCell>
                            <TableCell className="text-xs">{formatCurrency(item.value, item.currency)}</TableCell>
                            <TableCell className="text-xs">{formatAgeLabel(item.age_min)}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-xs text-gray-500 text-center py-4">
                            {reviewLoading || reviewValidating ? 'Loading review tasks…' : 'No pending manual reviews'}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Queue Depth Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Queues (BullMQ)</CardTitle>
              <p className="text-sm text-gray-600">CAD analysis, pricing, PDF generation</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Queue</TableHead>
                      <TableHead className="text-xs">Waiting</TableHead>
                      <TableHead className="text-xs">Active</TableHead>
                      <TableHead className="text-xs">Failed</TableHead>
                      <TableHead className="text-xs">Oldest</TableHead>
                      <TableHead className="text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueSnapshot.queues.length ? (
                      queueSnapshot.queues.map((queue) => (
                        <TableRow key={queue.name}>
                          <TableCell className="text-xs font-mono">{queue.name}</TableCell>
                          <TableCell className="text-xs">{queue.waiting}</TableCell>
                          <TableCell className="text-xs">{queue.active}</TableCell>
                          <TableCell className="text-xs">{queue.failed_24h}</TableCell>
                          <TableCell className="text-xs">
                            {Math.floor(queue.oldest_job_age_sec / 60)}m
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={queue.failed_24h === 0}
                                onClick={() => handleRetryFailed(queue.name)}
                              >
                                <PlayIcon className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleCleanCompleted(queue.name)}
                              >
                                <TrashIcon className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-xs text-gray-500 text-center py-4">
                          {queueValidating ? 'Loading queue status…' : 'No queues reporting metrics'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* DB Latency Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Database Latency</CardTitle>
              <p className="text-sm text-gray-600">Median & P95 read/write latency</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Read P95</div>
                    <div className="text-lg font-semibold">{formatLatencyMs(dbLatencySnapshot.read_p95_ms)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Write P95</div>
                    <div className="text-lg font-semibold">{formatLatencyMs(dbLatencySnapshot.write_p95_ms)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Error Rate</div>
                    <div className="text-lg font-semibold">{formatPercent(dbLatencySnapshot.error_rate_pct)}</div>
                  </div>
                </div>

                <div className="text-xs text-gray-500">
                  Observed {dbLatencySnapshot.observed_at ? new Date(dbLatencySnapshot.observed_at).toLocaleTimeString() : '—'}
                </div>

                {dbReadSeries.length || dbWriteSeries.length ? (
                  <div className="space-y-3">
                    {dbReadSeries.length ? (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Read trend</div>
                        <SparkBars data={dbReadSeries} color="bg-blue-500" />
                      </div>
                    ) : null}
                    {dbWriteSeries.length ? (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Write trend</div>
                        <SparkBars data={dbWriteSeries} color="bg-purple-500" />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    {dbValidating ? 'Loading database latency…' : 'No database latency samples captured'}
                  </div>
                )}

                <Button size="sm" variant="outline" className="w-full">
                  Open DB Health
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Webhook Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Webhook Status</CardTitle>
              <p className="text-sm text-gray-600">Delivery health for payment providers</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {webhookSnapshot.items.length ? (
                  webhookSnapshot.items.map((item) => (
                    <div key={item.provider} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{item.provider}</div>
                        <div className="text-sm text-gray-600">
                          Last: {item.last_event_type || '—'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.last_delivery_age != null ? `${item.last_delivery_age}s ago` : 'No deliveries in window'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <StatusBadge status={item.status} />
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={item.failed_24h === 0}
                          onClick={() => handleWebhookReplay(item.provider)}
                        >
                          <PlayIcon className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">{webhookValidating ? 'Loading webhook telemetry…' : 'No webhook providers reporting'}</div>
                )}

                <Button size="sm" variant="outline" className="w-full">
                  Open Monitor
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: SLO Tiles */}
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SLOs (P95)</CardTitle>
              <p className="text-sm text-gray-600">Real-time SLO conformance against service objectives</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-600">Time to First Price</div>
                  <div className="text-2xl font-bold">{formatLatencyMs(sloSnapshot.first_price_p95_ms)}</div>
                  <div className="text-sm text-gray-600">Target: ≤ 2000 ms</div>
                  <Badge className={`mt-2 ${getSLOTileColor(sloSnapshot.first_price_p95_ms, 2000, 2500)}`}>
                    {resolveSloBadge(sloSnapshot.first_price_p95_ms, 2000, 2500)}
                  </Badge>
                </div>

                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-600">CAD Analysis</div>
                  <div className="text-2xl font-bold">{formatLatencyMs(sloSnapshot.cad_p95_ms)}</div>
                  <div className="text-sm text-gray-600">Target: ≤ 20000 ms</div>
                  <Badge className={`mt-2 ${getSLOTileColor(sloSnapshot.cad_p95_ms, 20000, 30000)}`}>
                    {resolveSloBadge(sloSnapshot.cad_p95_ms, 20000, 30000)}
                  </Badge>
                </div>

                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-600">Payment → Order</div>
                  <div className="text-2xl font-bold">{formatLatencyMs(sloSnapshot.payment_to_order_p95_ms)}</div>
                  <div className="text-sm text-gray-600">Target: ≤ 10000 ms</div>
                  <Badge className={`mt-2 ${getSLOTileColor(sloSnapshot.payment_to_order_p95_ms, 10000, 15000)}`}>
                    {resolveSloBadge(sloSnapshot.payment_to_order_p95_ms, 10000, 15000)}
                  </Badge>
                </div>

                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-600">Queue Staleness</div>
                  <div className="text-2xl font-bold">{formatSeconds(sloSnapshot.oldest_job_age_sec)}</div>
                  <div className="text-sm text-gray-600">Target: ≤ 600 s</div>
                  <Badge className={`mt-2 ${getSLOTileColor(sloSnapshot.oldest_job_age_sec, 600, 1800)}`}>
                    {resolveSloBadge(sloSnapshot.oldest_job_age_sec, 600, 1800)}
                  </Badge>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                Observed {sloSnapshot.observed_at ? new Date(sloSnapshot.observed_at).toLocaleTimeString() : '—'}{sloValidating ? ' (refreshing…)' : ''}
              </div>
              {sloSnapshot.missing_metrics?.length ? (
                <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                  Missing metrics: {sloSnapshot.missing_metrics.join(', ')}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Row 3: Recent Errors Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Errors</CardTitle>
            <p className="text-sm text-gray-600">Latest application exceptions and failing jobs with quick remediation</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="sentry" className="w-full">
              <TabsList>
                <TabsTrigger value="sentry">App Errors</TabsTrigger>
                <TabsTrigger value="jobs">Failed Jobs</TabsTrigger>
              </TabsList>

              <TabsContent value="sentry">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Count (1h)</TableHead>
                      <TableHead>Users Affected</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.sentry.length ? (
                      errors.sentry.map((error) => (
                      <TableRow key={error.id}>
                        <TableCell>{new Date(error.last_seen).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{error.service}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{error.title}</TableCell>
                        <TableCell>{error.count_1h}</TableCell>
                        <TableCell>{error.users_affected}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost">
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              Create Issue
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-6">
                          {errorValidating ? 'Loading error events…' : 'No error events recorded'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TabsContent>

              <TabsContent value="jobs">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Queue</TableHead>
                      <TableHead>Job ID</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errors.failed_jobs.length ? (
                      errors.failed_jobs.map((job) => (
                        <TableRow key={`${job.queue}-${job.job_id}-${job.when}`}>
                          <TableCell>{new Date(job.when).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.queue}</Badge>
                        </TableCell>
                          <TableCell className="font-mono text-sm">{job.job_id}</TableCell>
                        <TableCell>{job.attempts}</TableCell>
                        <TableCell>{job.reason}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                                onClick={() => handleRetryJob(job.queue, job.job_id)}
                            >
                              <PlayIcon className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-gray-500 py-6">
                          {errorValidating ? 'Loading failed jobs…' : 'No failed jobs in window'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {errors.failed_jobs.length} failed jobs
                  </div>
                  <Button size="sm" variant="outline">
                    Retry All Failed (24h)
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SparkBars({ data, color, maxBars = 24 }: { data: number[]; color: string; maxBars?: number }) {
  if (!data.length) {
    return <div className="h-16 flex items-center justify-center text-xs text-gray-500 bg-gray-100 rounded">No samples</div>;
  }

  const series = data.slice(-maxBars);
  const ceiling = Math.max(...series) || 1;

  return (
    <div className="h-16 bg-gray-100 rounded flex items-end justify-between px-2">
      {series.map((value, index) => {
        const ratio = Math.max(value / ceiling, 0);
        const height = Math.max(ratio * 100, 4);
        return (
          <div
            key={`${index}-${value}`}
            className={`${color} w-2 rounded-t`}
            style={{ height: `${Math.min(height, 100)}%` }}
          />
        );
      })}
    </div>
  );
}

