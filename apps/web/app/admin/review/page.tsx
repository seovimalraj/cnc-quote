'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2, RefreshCw, Search as SearchIcon } from 'lucide-react';

import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import AdminReviewTable from '@/components/admin/review/AdminReviewTable';
import ReviewStatsCards from '@/components/admin/review/ReviewStatsCards';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminReviewQueue } from '@/hooks/useAdminReviewQueue';

type SortState = {
  readonly sort?: string;
  readonly order?: 'asc' | 'desc';
};

const SORTABLE_COLUMNS = new Set(['createdAt', 'totalValue', 'dfmFindingCount', 'priority', 'lastActionAt']);

export default function ManualReviewPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(() => searchParams?.get('search') ?? '');

  const { data, stats, meta, filters, isLoading, isFetching, isError, error, refetch } = useAdminReviewQueue();

  useEffect(() => {
    setSearchValue(searchParams?.get('search') ?? '');
  }, [searchParams]);

  const applyParams = useCallback(
    (updater: (params: URLSearchParams) => void, options?: { readonly resetCursor?: boolean }) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      updater(params);

      if (options?.resetCursor ?? true) {
        params.delete('cursor');
      }

      const query = params.toString();
      if (query.length > 0) {
        router.replace(`${pathname}?${query}`, { scroll: false });
      } else {
        router.replace(pathname, { scroll: false });
      }
    },
    [pathname, router, searchParams],
  );

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const value = searchValue.trim();
      applyParams((params) => {
        if (value.length > 0) {
          params.set('search', value);
        } else {
          params.delete('search');
        }
      });
    },
    [applyParams, searchValue],
  );

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    applyParams((params) => {
      params.delete('search');
    });
  }, [applyParams]);

  const handleResetFilters = useCallback(() => {
    setSearchValue('');
    applyParams((params) => {
      params.delete('search');
      params.delete('lane');
      params.delete('status');
      params.delete('assignee');
      params.delete('priority');
      params.delete('hasDFM');
      params.delete('dateFrom');
      params.delete('dateTo');
      params.delete('minValue');
      params.delete('maxValue');
    });
  }, [applyParams]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleSortChange = useCallback(
    (state: SortState) => {
      const nextSort = state.sort && SORTABLE_COLUMNS.has(state.sort) ? state.sort : undefined;
      applyParams((params) => {
        if (nextSort) {
          params.set('sort', nextSort);
          params.set('order', state.order ?? 'asc');
        } else {
          params.delete('sort');
          params.delete('order');
        }
      });
    },
    [applyParams],
  );

  const hasAnyResults = data.length > 0;
  const initialLoading = isLoading && !hasAnyResults;

  const sortState = useMemo<SortState>(() => ({ sort: filters.sort, order: filters.order }), [filters.sort, filters.order]);

  const hasActiveFilters = useMemo(() => {
    const hasSearch = Boolean(filters.search && filters.search.trim().length > 0);
    const hasLane = Array.isArray(filters.lane) ? filters.lane.length > 0 : Boolean(filters.lane);
    const hasStatus = Array.isArray(filters.status) ? filters.status.length > 0 : Boolean(filters.status);
    const hasAssignee = Array.isArray(filters.assignee)
      ? filters.assignee.length > 0
      : Boolean(filters.assignee);
    const hasPriority = Array.isArray(filters.priority)
      ? filters.priority.length > 0
      : Boolean(filters.priority);
    const hasDFM = filters.hasDFM === true;
    const hasValueRange = filters.minValue !== undefined || filters.maxValue !== undefined;
    const hasDateRange = filters.dateFrom !== undefined || filters.dateTo !== undefined;

    return (
      hasSearch ||
      hasLane ||
      hasStatus ||
      hasAssignee ||
      hasPriority ||
      hasDFM ||
      hasValueRange ||
      hasDateRange
    );
  }, [
    filters.assignee,
    filters.dateFrom,
    filters.dateTo,
    filters.hasDFM,
    filters.lane,
    filters.maxValue,
    filters.minValue,
    filters.priority,
    filters.search,
    filters.status,
  ]);

  return (
    <RequireAnyRole
      roles={['admin', 'org_admin', 'reviewer', 'finance']}
      fallback={<div className="p-6 text-sm text-red-600">Access denied</div>}
    >
      <div className="space-y-6 p-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Manual Review Queue</h1>
            <p className="text-sm text-muted-foreground">
              Monitor quote triage progress and drill into items that need your attention.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <SearchIcon className="absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search quotes, customers, companies"
                className="w-64 pl-9"
                aria-label="Search manual review quotes"
              />
              {searchValue.length > 0 && (
                <Button type="button" variant="ghost" size="sm" className="ml-2" onClick={handleClearSearch}>
                  Clear
                </Button>
              )}
            </form>
            <Button type="button" variant="outline" onClick={handleRefresh} disabled={isFetching}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </header>

        <ReviewStatsCards stats={stats} isFetching={isFetching} />

        {isError ? (
          <ErrorState error={error} onRetry={handleRefresh} />
        ) : initialLoading ? (
          <LoadingState />
        ) : !hasAnyResults ? (
          <EmptyState hasFilters={hasActiveFilters} onReset={handleResetFilters} />
        ) : (
          <AdminReviewTable
            rows={data}
            meta={meta}
            isFetching={isFetching}
            currentSort={sortState}
            onSortChange={handleSortChange}
            data-testid="manual-review-table"
          />
        )}
      </div>
    </RequireAnyRole>
  );
}

function LoadingState() {
  return (
    <div className="flex h-48 items-center justify-center rounded border bg-card text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
  Loading review queue...
    </div>
  );
}

function ErrorState({ error, onRetry }: { readonly error: Error | null; readonly onRetry: () => void }) {
  return (
    <Card className="border-destructive/40 bg-destructive/10">
      <CardHeader className="flex flex-row items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
        <div>
          <CardTitle className="text-base">Failed to load review queue</CardTitle>
          <p className="text-xs text-destructive/80">{error?.message ?? 'Please try again in a moment.'}</p>
        </div>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({ hasFilters, onReset }: { readonly hasFilters: boolean; readonly onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded border border-dashed bg-card py-16 text-center">
      <p className="text-sm font-medium text-foreground">No quotes match the current filters.</p>
      <p className="max-w-sm text-xs text-muted-foreground">
        {hasFilters
          ? 'Adjust or clear your filters to widen the search.'
          : 'New manual review items will appear here as quotes are submitted.'}
      </p>
      {hasFilters ? (
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      ) : null}
    </div>
  );
}
