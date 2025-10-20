'use client';

import React, { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';

import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

type AuditLogEvent = {
  id: string;
  ts: string;
  actor_user_id: string;
  actor_role: string;
  ip: string;
  area: string;
  action: string;
  target_id?: string;
  notes?: string;
};

type FeatureFlag = {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  rollout_percentage: number;
  updated_at?: string;
  updated_by?: string;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }
  return response.json() as Promise<T>;
};

const formatTimestamp = (value?: string) => {
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

export default function AdminSecurityPage() {
  const [flagError, setFlagError] = useState<string | null>(null);
  const [pendingFlag, setPendingFlag] = useState<string | null>(null);

  const {
    data: auditEvents,
    error: auditError,
    isLoading: auditLoading,
  } = useSWR<AuditLogEvent[]>(
    '/api/admin/settings/audit?limit=20',
    (url) => fetcher<AuditLogEvent[]>(url),
    { refreshInterval: 60000 },
  );

  const {
    data: featureFlags,
    error: flagFetchError,
    isLoading: flagsLoading,
    mutate: mutateFlags,
  } = useSWR<FeatureFlag[]>(
    '/api/admin/feature-flags',
    (url) => fetcher<FeatureFlag[]>(url),
    { refreshInterval: 120000 },
  );

  const flagAnalytics = useMemo(() => {
    const flags = featureFlags ?? [];
    if (!flags.length) {
      return { total: 0, enabled: 0, disabled: 0, rollout: 0 };
    }
    const enabled = flags.filter((flag) => flag.enabled).length;
    const rollout = flags.reduce((sum, flag) => sum + flag.rollout_percentage, 0) / flags.length;
    return {
      total: flags.length,
      enabled,
      disabled: flags.length - enabled,
      rollout: Math.round(rollout * 100) / 100,
    };
  }, [featureFlags]);

  const handleToggleFlag = useCallback(
    async (flag: FeatureFlag, nextEnabled: boolean) => {
      setPendingFlag(flag.id);
      setFlagError(null);
      try {
        const response = await fetch(`/api/admin/feature-flags/${encodeURIComponent(flag.id)}/toggle`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: nextEnabled, updatedBy: 'admin-console' }),
        });

        if (!response.ok) {
          throw new Error(`Toggle failed with status ${response.status}`);
        }

        await mutateFlags();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to toggle feature flag';
        setFlagError(message);
      } finally {
        setPendingFlag(null);
      }
    },
    [mutateFlags],
  );

  const auditErrorMessage = auditError instanceof Error ? auditError.message : auditError ? String(auditError) : '';
  const flagFetchErrorMessage = flagFetchError instanceof Error ? flagFetchError.message : flagFetchError ? String(flagFetchError) : '';

  return (
    <RequireAnyRole roles={['admin', 'org_admin', 'auditor']} fallback={<div className="p-4 text-sm text-red-600">Access denied</div>}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Security &amp; Compliance</h1>
            <p className="text-sm text-gray-600">Real-time visibility into privileged activity, rollout controls, and tenant safety.</p>
          </div>
          <div className="flex gap-3 text-xs text-gray-500">
            <span>Total flags: {flagAnalytics.total}</span>
            <span>Enabled: {flagAnalytics.enabled}</span>
            <span>Avg rollout: {flagAnalytics.rollout}%</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Privileged Audit Trail</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditError ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Unable to load audit logs: {auditErrorMessage || 'Unknown error'}
              </div>
            ) : null}
            {auditLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {(auditEvents ?? []).map((event) => (
                  <li key={event.id} className="py-3 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {event.action}
                        {event.target_id ? <span className="text-gray-400"> · {event.target_id}</span> : null}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTimestamp(event.ts)} · actor {event.actor_user_id} ({event.actor_role}) · ip {event.ip}
                      </p>
                      {event.notes ? (
                        <p className="text-xs text-gray-500">{event.notes}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="self-start md:self-auto uppercase tracking-wide text-[10px]">
                      {event.area || 'general'}
                    </Badge>
                  </li>
                ))}
                {!auditEvents?.length && !auditLoading ? (
                  <li className="py-6 text-sm text-gray-500 text-center">No privileged activity recorded in this window.</li>
                ) : null}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Flag Governance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {flagFetchError ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Unable to load feature flags: {flagFetchErrorMessage || 'Unknown error'}
              </div>
            ) : null}
            {flagError ? (
              <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                {flagError}
              </div>
            ) : null}
            <div className="overflow-hidden rounded-md border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Flag</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Description</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Rollout %</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {flagsLoading ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4"><Skeleton className="h-6 w-full" /></td>
                    </tr>
                  ) : null}
                  {(featureFlags ?? []).map((flag) => (
                    <tr key={flag.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{flag.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{flag.key}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{flag.description}</td>
                      <td className="px-3 py-2 text-gray-600">{flag.rollout_percentage}%</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={flag.enabled}
                            disabled={pendingFlag === flag.id}
                            onCheckedChange={(checked) => handleToggleFlag(flag, checked)}
                            aria-label={`Toggle ${flag.key}`}
                          />
                          <span className="text-xs text-gray-500">
                            {flag.enabled ? 'Enabled' : 'Disabled'}
                            {flag.updated_at ? ` · ${formatTimestamp(flag.updated_at)}` : ''}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!flagsLoading && !featureFlags?.length ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-sm text-gray-500 text-center">
                        No feature flags configured yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Keys &amp; Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              API key issuance is managed via Supabase row-level security. Use the CLI workflow under <code>scripts/</code> to mint
              scoped partner keys; audit events above track every grant &amp; revoke operation.
            </p>
            <Button size="sm" variant="outline" asChild>
              <a href="/docs/ADMIN_GUIDE.md" target="_blank" rel="noopener noreferrer">
                View API Key Runbook
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </RequireAnyRole>
  );
}
