'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { RBACGuard } from '@/components/auth/RBACGuard';
import AuditDiff from '@/components/AuditDiff';

interface AuditListItem {
  id: string;
  created_at: string;
  action: string;
  user_id: string | null;
  resource_type: string;
  resource_id: string | null;
  request_id: string | null;
  trace_id: string | null;
  path: string | null;
  method: string | null;
}

interface AuditDetail extends AuditListItem {
  before_json: unknown;
  after_json: unknown;
  ip: string | null;
  ua: string | null;
}

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All actions' },
  { value: 'ORG_CREATED', label: 'Org Created' },
  { value: 'ORG_INVITE_SENT', label: 'Org Invite Sent' },
  { value: 'ORG_INVITE_ACCEPTED', label: 'Org Invite Accepted' },
  { value: 'ROLE_CHANGED', label: 'Role Changed' },
  { value: 'QUOTE_CREATED', label: 'Quote Created' },
  { value: 'QUOTE_STATUS_CHANGED', label: 'Quote Status Changed' },
  { value: 'QUOTE_REPRICED', label: 'Quote Repriced' },
  { value: 'FILE_UPLOADED', label: 'File Uploaded' },
  { value: 'FILE_DELETED', label: 'File Deleted' },
  { value: 'PAYMENT_METHOD_ADDED', label: 'Payment Method Added' },
  { value: 'INVOICE_ISSUED', label: 'Invoice Issued' },
];

const RESOURCE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All resources' },
  { value: 'org', label: 'Organization' },
  { value: 'org_member', label: 'Org Member' },
  { value: 'quote', label: 'Quote' },
  { value: 'quote_line', label: 'Quote Line' },
  { value: 'file', label: 'File' },
  { value: 'payment', label: 'Payment' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'policy', label: 'Policy' },
  { value: 'user', label: 'User' },
];

interface FiltersState {
  action: string;
  userId: string;
  resourceType: string;
  resourceId: string;
  from: string;
  to: string;
}

const DEFAULT_FILTERS: FiltersState = {
  action: '',
  userId: '',
  resourceType: '',
  resourceId: '',
  from: '',
  to: '',
};

function AuditLogContent() {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FiltersState>(DEFAULT_FILTERS);
  const [items, setItems] = useState<AuditListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, AuditDetail>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const orgId = user?.org?.id;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.action) params.set('action', filters.action);
    if (filters.userId) params.set('user_id', filters.userId);
    if (filters.resourceType) params.set('resource_type', filters.resourceType);
    if (filters.resourceId) params.set('resource_id', filters.resourceId);
    if (filters.from) params.set('from', new Date(filters.from).toISOString());
    if (filters.to) params.set('to', new Date(filters.to).toISOString());
    if (cursor) params.set('cursor', cursor);
    params.set('limit', '50');
    return params.toString();
  }, [filters, cursor]);

  useEffect(() => {
    let isCancelled = false;

    const fetchLogs = async () => {
      if (!orgId) return;
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/audit?${queryString}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(orgId ? { 'X-Org-Id': orgId } : {}),
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load audit log (${response.status})`);
        }

        const data = await response.json();
        if (isCancelled) return;
        setItems(data.items || []);
        setNextCursor(data.next_cursor || null);
      } catch (err) {
        if (!isCancelled) {
          setError((err as Error).message);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchLogs();

    return () => {
      isCancelled = true;
    };
  }, [queryString, orgId]);

  const onFilterChange = (key: keyof FiltersState, value: string) => {
    setCursor(null);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setCursor(null);
    setFilters(DEFAULT_FILTERS);
  };

  const loadMore = () => {
    if (nextCursor) {
      setCursor(nextCursor);
    }
  };

  const onExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    if (!details[id]) {
      try {
        const response = await fetch(`/audit/${id}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(orgId ? { 'X-Org-Id': orgId } : {}),
          },
        });
        if (response.ok) {
          const data = await response.json();
          setDetails((prev) => ({ ...prev, [id]: data }));
        }
      } catch (err) {
        console.error('Failed to load audit detail', err);
      }
    }

    setExpandedId(id);
  };

  const exportCsv = async () => {
    try {
      const params = new URLSearchParams(queryString);
      params.set('limit', '200');
      const response = await fetch(`/audit?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(orgId ? { 'X-Org-Id': orgId } : {}),
        },
      });
      if (!response.ok) throw new Error('Failed to export audit log');
      const data = await response.json();
      const rows: string[] = [];
      rows.push('id,created_at,action,user_id,resource_type,resource_id,request_id,trace_id,path,method');
      for (const item of data.items || []) {
        const values = [
          item.id,
          item.created_at,
          item.action,
          item.user_id ?? '',
          item.resource_type,
          item.resource_id ?? '',
          item.request_id ?? '',
          item.trace_id ?? '',
          item.path ?? '',
          item.method ?? '',
        ].map((value) => {
          const normalized = value.replace(/"/g, '""');
          return `"${normalized}"`;
        });
        rows.push(values.join(','));
      }
      const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-log-${new Date().toISOString()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      alert('Failed to export audit log.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
          Immutable record of privileged actions. Filters apply per organization. CSV export limited to 200 rows.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900 md:grid-cols-6">
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Action
          </label>
          <select
            value={filters.action}
            onChange={(e) => onFilterChange('action', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            {ACTION_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            User ID
          </label>
          <input
            value={filters.userId}
            onChange={(e) => onFilterChange('userId', e.target.value)}
            placeholder="user-uuid"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Resource Type
          </label>
          <select
            value={filters.resourceType}
            onChange={(e) => onFilterChange('resourceType', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          >
            {RESOURCE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Resource ID
          </label>
          <input
            value={filters.resourceId}
            onChange={(e) => onFilterChange('resourceId', e.target.value)}
            placeholder="resource identifier"
            className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            From
          </label>
          <input
            type="date"
            value={filters.from}
            onChange={(e) => onFilterChange('from', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            To
          </label>
          <input
            type="date"
            value={filters.to}
            onChange={(e) => onFilterChange('to', e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={exportCsv}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90"
          >
            Export CSV
          </button>
          <button
            onClick={resetFilters}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Resource</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">User</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-300">Trace</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  Loading audit events…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                  No audit events match your filters.
                </td>
              </tr>
            )}
            {items.map((item) => {
              const isExpanded = expandedId === item.id;
              const detail = details[item.id];
              return (
                <Fragment key={item.id}>
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-100">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {item.action}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      <div>{item.resource_type}</div>
                      {item.resource_id && <div className="text-xs text-gray-500">{item.resource_id}</div>}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      {item.user_id ?? '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      <div>{item.trace_id ?? '—'}</div>
                      {item.request_id && <div className="text-xs text-gray-500">req: {item.request_id}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => onExpand(item.id)}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        {isExpanded ? 'Hide' : 'Inspect'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${item.id}-details`} className="bg-gray-50 dark:bg-gray-800">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-4 text-sm text-gray-700 dark:text-gray-200">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">HTTP</div>
                              <div>Path: {detail?.path ?? item.path ?? '—'}</div>
                              <div>Method: {detail?.method ?? item.method ?? '—'}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-gray-100">Client</div>
                              <div>IP: {detail?.ip ?? '—'}</div>
                              <div>User Agent: {detail?.ua ?? '—'}</div>
                            </div>
                          </div>
                          <AuditDiff before={detail?.before_json} after={detail?.after_json} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {nextCursor && (
          <div className="border-t border-gray-200 bg-gray-50 p-4 text-right dark:border-gray-700 dark:bg-gray-900">
            <button
              onClick={loadMore}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Load more
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/50 dark:text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

function NotAuthorized() {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200">
      You do not have permission to view the audit log. Please contact an administrator.
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <RBACGuard allowedRoles={['admin', 'security_analyst']} fallback={<NotAuthorized />}>
      <AuditLogContent />
    </RBACGuard>
  );
}
