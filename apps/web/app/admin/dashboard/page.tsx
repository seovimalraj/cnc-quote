'use client';

import { OverviewCardsGroup } from '../../(home)/_components/overview-cards';
import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminRecentEvents } from '@/hooks/useAdminRecentEvents';
import { Users, FileText, Settings, BarChart3, Activity, RefreshCcw, AlertTriangle, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { ContractsV1 } from '@cnc-quote/shared';

type ActorShape = {
  id?: string | null;
  role?: string | null;
  name?: string | null;
  email?: string | null;
} | null | undefined;

type TargetShape = {
  type?: string | null;
  id?: string | null;
  org_id?: string | null;
} | null | undefined;

function formatTimestamp(value?: string) {
  if (!value) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatActorLabel(actor?: ActorShape) {
  if (!actor) {
    return 'system';
  }

  return actor.name || actor.email || actor.id || actor.role || 'system';
}

function formatTargetLabel(target?: TargetShape) {
  if (!target) {
    return null;
  }

  const pieces = [target.type, target.id].filter((value): value is string => Boolean(value));
  return pieces.length ? pieces.join(' · ') : null;
}

function alertStyles(severity: ContractsV1.AdminRecentEventAlertSeverityV1) {
  switch (severity) {
    case 'critical':
      return {
        container: 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-900/30 dark:text-red-200',
        badge: 'bg-red-600 text-white hover:bg-red-600',
        icon: <ShieldAlert className="h-3.5 w-3.5" />,
      };
    case 'warning':
      return {
        container: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/40 dark:bg-amber-900/30 dark:text-amber-200',
        badge: 'bg-amber-500 text-white hover:bg-amber-500',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      };
    default:
      return {
        container: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/40 dark:bg-blue-900/30 dark:text-blue-200',
        badge: 'bg-blue-500 text-white hover:bg-blue-500',
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
      };
  }
}

export default function AdminDashboardPage() {
  const {
    events,
    fetchedAt,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useAdminRecentEvents(10);

  const errorMessage = error?.message ?? 'Unknown error';

  return (
    <RequireAnyRole roles={['admin','org_admin','reviewer','finance','auditor']} fallback={<div className="p-6 text-sm text-red-600">Access denied</div>}>
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Operational overview & quick actions.</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/admin/security">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Link>
        </Button>
      </div>
      <OverviewCardsGroup />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              User Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Manage user accounts, roles, and permissions.</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/users">Manage Users</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Content Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Update website content, pages, and resources.</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/content">Manage Content</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">View detailed analytics and system metrics.</p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/metrics">View Analytics</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      <Card className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            Recent Activity
          </CardTitle>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {fetchedAt ? <span>Updated {formatTimestamp(fetchedAt)}</span> : null}
            {isFetching ? (
              <span className="flex items-center gap-1 text-primary">
                <RefreshCcw className="h-3 w-3 animate-spin" />
                Refreshing
              </span>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isError ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Unable to load recent events: {errorMessage}
            </div>
          ) : null}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {events.map((event) => {
                const targetLabel = formatTargetLabel(event.target);

                return (
                  <li key={event.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                        {event.action}
                        {targetLabel ? <span className="text-gray-400"> · {targetLabel}</span> : null}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(event.occurred_at)} · actor {formatActorLabel(event.actor)}
                        {event.ip ? ` · ip ${event.ip}` : ''}
                      </p>
                      {event.notes ? <p className="text-xs text-gray-500 dark:text-gray-400">{event.notes}</p> : null}
                      {event.alerts?.length ? (
                        <div className="mt-2 space-y-2">
                          {event.alerts.map((alert, index) => {
                            const styles = alertStyles(alert.severity ?? 'warning');
                            return (
                              <div
                                key={`${event.id}-alert-${index}`}
                                className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-xs transition-colors ${styles.container}`}
                              >
                                <span className="mt-0.5">{styles.icon}</span>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge className={`h-5 px-2 ${styles.badge}`}>{alert.severity?.toUpperCase() ?? 'WARN'}</Badge>
                                    <span className="font-medium uppercase tracking-wide text-[11px] text-current">
                                      {alert.code.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  <p className="leading-snug text-current">{alert.message}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="self-start uppercase tracking-wide text-[10px] md:self-auto">
                      {event.area}
                    </Badge>
                  </li>
                );
              })}
              {!events.length ? (
                <li className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  No privileged activity recorded in this window.
                </li>
              ) : null}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
    </RequireAnyRole>
  );
}
