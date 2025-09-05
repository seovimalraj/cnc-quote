'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  InformationCircleIcon,
  PlayIcon,
  TrashIcon,
  EyeIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';
import { trackEvent } from '@/lib/analytics/posthog';

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

  // Mock data - in real implementation, this would come from API calls
  const [dashboardData, setDashboardData] = useState({
    openReviews: {
      count: 12,
      new_count: 3,
      aging_count: 6,
      breached_count: 3,
      items: [
        {
          quote_id: 'Q41-1742-8058',
          org: 'Acme Corp',
          value: 227.98,
          dfm_blockers: 0,
          age_min: 35,
          assignee: 'me@shop.com'
        },
        {
          quote_id: 'Q41-1742-8059',
          org: 'TechStart Inc',
          value: 1450.50,
          dfm_blockers: 2,
          age_min: 180,
          assignee: 'Unassigned'
        }
      ]
    },
    queues: [
      {
        name: 'cad:analyze',
        waiting: 0,
        active: 2,
        delayed: 1,
        failed_24h: 0,
        oldest_job_age_sec: 120
      },
      {
        name: 'pdf:render',
        waiting: 10,
        active: 1,
        delayed: 0,
        failed_24h: 2,
        oldest_job_age_sec: 900
      },
      {
        name: 'pricing:calculate',
        waiting: 3,
        active: 0,
        delayed: 0,
        failed_24h: 1,
        oldest_job_age_sec: 45
      }
    ],
    db: {
      read_p95_ms: 18,
      write_p95_ms: 22,
      error_rate_pct: 0.2,
      timeseries: {
        t: ['12:01', '12:02', '12:03'],
        read_ms: [15, 20, 18],
        write_ms: [18, 25, 22]
      }
    },
    webhooks: {
      stripe: {
        status: 'OK',
        failed_24h: 0,
        last_event_type: 'checkout.session.completed',
        last_delivery_age: 42
      },
      paypal: {
        status: 'WARN',
        failed_24h: 1,
        last_event_type: 'PAYMENT.CAPTURE.COMPLETED',
        last_delivery_age: 180
      }
    },
    slos: {
      first_price_p95_ms: 1450,
      cad_p95_ms: 18000,
      payment_to_order_p95_ms: 6200,
      oldest_job_age_sec: 210
    },
    errors: {
      sentry: [
        {
          id: 'err_123',
          service: 'api',
          title: 'TypeError: Cannot read property \'x\'',
          count_1h: 12,
          first_seen: '2025-09-05T10:22:00Z',
          last_seen: '2025-09-05T11:10:00Z',
          users_affected: 3,
          permalink: 'https://sentry.io/...'
        }
      ],
      jobs: [
        {
          when: '2025-09-05T11:08:00Z',
          queue: 'cad:analyze',
          jobId: 'a1b2',
          attempts: 3,
          reason: 'Timeout'
        },
        {
          when: '2025-09-05T11:05:00Z',
          queue: 'pdf:render',
          jobId: 'c3d4',
          attempts: 2,
          reason: 'File not found'
        }
      ]
    }
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    trackEvent('workcenter_refresh');

    // Mock API calls - in real implementation, these would be actual API calls
    await new Promise(resolve => setTimeout(resolve, 1000));

    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  const handleRetryFailed = useCallback(async (queueName: string) => {
    trackEvent('workcenter_retry_failed', { queue: queueName });
    // Mock retry action
    await new Promise(resolve => setTimeout(resolve, 500));
    // Update local state to reflect changes
    setDashboardData(prev => ({
      ...prev,
      queues: prev.queues.map(q =>
        q.name === queueName ? { ...q, failed_24h: 0 } : q
      )
    }));
  }, []);

  const handleWebhookReplay = useCallback(async (provider: string) => {
    trackEvent(`webhook_replay_${provider.toLowerCase()}`);
    // Mock replay action
    await new Promise(resolve => setTimeout(resolve, 500));
    // Update local state
    setDashboardData(prev => ({
      ...prev,
      webhooks: {
        ...prev.webhooks,
        [provider.toLowerCase()]: {
          ...prev.webhooks[provider.toLowerCase() as keyof typeof prev.webhooks],
          failed_24h: 0,
          status: 'OK' as const
        }
      }
    }));
  }, []);

  const handleRetryJob = useCallback(async (queue: string, jobId: string) => {
    trackEvent('workcenter_retry_one', { queue, jobId });
    // Mock retry action
    await new Promise(resolve => setTimeout(resolve, 500));
    // Remove from failed jobs list
    setDashboardData(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        jobs: prev.errors.jobs.filter(j => j.jobId !== jobId)
      }
    }));
  }, []);

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

  const getSLOTileColor = (value: number, target: number, warningThreshold?: number) => {
    if (value <= target) return 'bg-green-100 text-green-800';
    if (warningThreshold && value <= warningThreshold) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
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
        {dashboardData.openReviews.breached_count > 0 && (
          <Alert className="mb-6">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertDescription>
              Manual review SLA breached for {dashboardData.openReviews.breached_count} quotes.
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
                <div className="text-3xl font-bold">{dashboardData.openReviews.count}</div>

                <div className="flex space-x-2">
                  <Badge className="bg-green-100 text-green-800">
                    {dashboardData.openReviews.new_count} New (&lt;1h)
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {dashboardData.openReviews.aging_count} Aging (1–4h)
                  </Badge>
                  <Badge className="bg-red-100 text-red-800">
                    {dashboardData.openReviews.breached_count} Breached (&gt;4h)
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
                      {dashboardData.openReviews.items.slice(0, 3).map((item) => (
                        <TableRow key={item.quote_id} className="cursor-pointer hover:bg-gray-50">
                          <TableCell className="text-xs font-mono">{item.quote_id}</TableCell>
                          <TableCell className="text-xs">{item.org}</TableCell>
                          <TableCell className="text-xs">${item.value}</TableCell>
                          <TableCell className="text-xs">{Math.floor(item.age_min / 60)}h</TableCell>
                        </TableRow>
                      ))}
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
                    {dashboardData.queues.map((queue) => (
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
                            <Button size="sm" variant="ghost">
                              <TrashIcon className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
                    <div className="text-lg font-semibold">{dashboardData.db.read_p95_ms} ms</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Write P95</div>
                    <div className="text-lg font-semibold">{dashboardData.db.write_p95_ms} ms</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Error Rate</div>
                    <div className="text-lg font-semibold">{dashboardData.db.error_rate_pct}%</div>
                  </div>
                </div>

                {/* Simple sparkline placeholder */}
                <div className="h-16 bg-gray-100 rounded flex items-end justify-between px-2">
                  {dashboardData.db.timeseries.read_ms.map((value, i) => (
                    <div
                      key={i}
                      className="bg-blue-500 w-2 rounded-t"
                      style={{ height: `${(value / 30) * 100}%` }}
                    />
                  ))}
                </div>

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
                {/* Stripe */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Stripe</div>
                    <div className="text-sm text-gray-600">
                      Last: {dashboardData.webhooks.stripe.last_event_type}
                    </div>
                    <div className="text-sm text-gray-600">
                      {dashboardData.webhooks.stripe.last_delivery_age}s ago
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={dashboardData.webhooks.stripe.status} />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={dashboardData.webhooks.stripe.failed_24h === 0}
                      onClick={() => handleWebhookReplay('stripe')}
                    >
                      <PlayIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* PayPal */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">PayPal</div>
                    <div className="text-sm text-gray-600">
                      Last: {dashboardData.webhooks.paypal.last_event_type}
                    </div>
                    <div className="text-sm text-gray-600">
                      {dashboardData.webhooks.paypal.last_delivery_age}s ago
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <StatusBadge status={dashboardData.webhooks.paypal.status} />
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={dashboardData.webhooks.paypal.failed_24h === 0}
                      onClick={() => handleWebhookReplay('paypal')}
                    >
                      <PlayIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

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
                  <div className="text-2xl font-bold">{dashboardData.slos.first_price_p95_ms} ms</div>
                  <div className="text-sm text-gray-600">Target: ≤ 2000 ms</div>
                  <Badge className={`mt-2 ${getSLOTileColor(dashboardData.slos.first_price_p95_ms, 2000, 2500)}`}>
                    {dashboardData.slos.first_price_p95_ms <= 2000 ? '✓' : dashboardData.slos.first_price_p95_ms <= 2500 ? '⚠' : '✗'}
                  </Badge>
                </div>

                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-600">CAD Analysis</div>
                  <div className="text-2xl font-bold">{dashboardData.slos.cad_p95_ms} ms</div>
                  <div className="text-sm text-gray-600">Target: ≤ 20000 ms</div>
                  <Badge className={`mt-2 ${getSLOTileColor(dashboardData.slos.cad_p95_ms, 20000, 30000)}`}>
                    {dashboardData.slos.cad_p95_ms <= 20000 ? '✓' : dashboardData.slos.cad_p95_ms <= 30000 ? '⚠' : '✗'}
                  </Badge>
                </div>

                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-600">Payment → Order</div>
                  <div className="text-2xl font-bold">{dashboardData.slos.payment_to_order_p95_ms} ms</div>
                  <div className="text-sm text-gray-600">Target: ≤ 10000 ms</div>
                  <Badge className={`mt-2 ${getSLOTileColor(dashboardData.slos.payment_to_order_p95_ms, 10000, 15000)}`}>
                    {dashboardData.slos.payment_to_order_p95_ms <= 10000 ? '✓' : dashboardData.slos.payment_to_order_p95_ms <= 15000 ? '⚠' : '✗'}
                  </Badge>
                </div>

                <div className="p-4 border rounded">
                  <div className="text-sm text-gray-600">Queue Staleness</div>
                  <div className="text-2xl font-bold">{dashboardData.slos.oldest_job_age_sec} s</div>
                  <div className="text-sm text-gray-600">Target: ≤ 600 s</div>
                  <Badge className={`mt-2 ${getSLOTileColor(dashboardData.slos.oldest_job_age_sec, 600, 1800)}`}>
                    {dashboardData.slos.oldest_job_age_sec <= 600 ? '✓' : dashboardData.slos.oldest_job_age_sec <= 1800 ? '⚠' : '✗'}
                  </Badge>
                </div>
              </div>
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
                    {dashboardData.errors.sentry.map((error) => (
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
                    ))}
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
                    {dashboardData.errors.jobs.map((job) => (
                      <TableRow key={job.jobId}>
                        <TableCell>{new Date(job.when).toLocaleTimeString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{job.queue}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{job.jobId}</TableCell>
                        <TableCell>{job.attempts}</TableCell>
                        <TableCell>{job.reason}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRetryJob(job.queue, job.jobId)}
                            >
                              <PlayIcon className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <EyeIcon className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {dashboardData.errors.jobs.length} failed jobs
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

function NeedsReviewQueue() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
          Needs Review
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Quote ID</th>
                <th className="text-left p-3 font-medium">Org</th>
                <th className="text-left p-3 font-medium">Complexity</th>
                <th className="text-left p-3 font-medium">DFM Blockers</th>
                <th className="text-left p-3 font-medium">Value</th>
                <th className="text-left p-3 font-medium">SLA Age</th>
                <th className="text-left p-3 font-medium">Assignee</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockNeedsReview.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{item.id}</td>
                  <td className="p-3">{item.org}</td>
                  <td className="p-3">
                    <Badge
                      variant="secondary"
                      className={
                        item.complexity === 'High'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {item.complexity}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {item.dfmBlockers > 0 ? (
                      <Badge variant="destructive">
                        {item.dfmBlockers}
                      </Badge>
                    ) : (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    )}
                  </td>
                  <td className="p-3 font-medium">${item.value.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.slaAge.includes('2h')
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.slaAge}
                    </span>
                  </td>
                  <td className="p-3">
                    {item.assignee === 'Unassigned' ? (
                      <span className="text-gray-500">Unassigned</span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserIcon className="h-4 w-4" />
                        {item.assignee}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        Assign
                      </Button>
                      <Button size="sm">
                        Approve & Send
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function PricedQueue() {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircleIcon className="h-5 w-5 text-green-500" />
          Priced
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Quote ID</th>
                <th className="text-left p-3 font-medium">Org</th>
                <th className="text-left p-3 font-medium">Price</th>
                <th className="text-left p-3 font-medium">Speed</th>
                <th className="text-left p-3 font-medium">Updated</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {mockPriced.map((item) => (
                <tr key={item.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{item.id}</td>
                  <td className="p-3">{item.org}</td>
                  <td className="p-3 font-medium text-green-600">
                    ${item.price.toLocaleString()}
                  </td>
                  <td className="p-3">
                    <Badge variant="secondary">
                      {item.speed}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {new Date(item.updated).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button size="sm">
                        Send
                      </Button>
                      <Button size="sm" variant="outline">
                        Lock Price
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemHealthRail() {
  const healthItems = [
    { label: 'API OK', status: 'good' },
    { label: 'CAD OK', status: 'good' },
    { label: 'Webhooks OK', status: 'good' },
    { label: 'Queue Depth', status: 'warn', value: '23' }
  ];

  const sloItems = [
    { label: 'First Price', value: '1.8s', target: '2.0s', status: 'good' },
    { label: 'CAD Analysis', value: '45s', target: '60s', status: 'good' },
    { label: 'Payment→Order', value: '3.2s', target: '5.0s', status: 'good' }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <div className="flex items-center gap-2">
                  {item.value && (
                    <span className="text-sm font-medium">{item.value}</span>
                  )}
                  <div className={`w-2 h-2 rounded-full ${
                    item.status === 'good' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>P95 SLOs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {sloItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${
                    item.status === 'good' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.value}
                  </span>
                  <span className="text-xs text-gray-500">/ {item.target}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminWorkcenterPage() {
  return (
    <DefaultLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Quoting Workcenter</h1>
        </div>

        {/* Filters Toolbar */}
        <FiltersToolbar />

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-3 space-y-6">
            <NeedsReviewQueue />
            <PricedQueue />
          </div>

          {/* Right Rail */}
          <div className="xl:col-span-1">
            <SystemHealthRail />
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}
