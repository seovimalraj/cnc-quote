'use client';
/**
 * @module AdminQuotesPage
 * @ownership web/admin
 * @purpose Display the admin-facing quote list with filtering and drill-down entry points.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Loader2, RefreshCw, Search as SearchIcon } from 'lucide-react';
import { ContractsVNext } from '@cnc-quote/shared';

import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { AdminQuotesTable } from '@/components/admin/quotes/AdminQuotesTable';
import { QuoteStatsCards } from '@/components/admin/quotes/QuoteStatsCards';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAdminQuotesList } from '@/hooks/useAdminQuotesList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function AdminQuotesPage() {
  return (
    <RequireAnyRole
      roles={['admin', 'org_admin', 'reviewer', 'finance']}
      fallback={<div className="p-6 text-sm text-red-600">Access denied</div>}
    >
      <Suspense fallback={<LoadingState />}>
        <AdminQuotesContent />
      </Suspense>
    </RequireAnyRole>
  );
}

function AdminQuotesContent() {
  const router = useRouter();
  const pathname = usePathname() ?? '/admin/quotes';
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(() => searchParams?.get('search') ?? '');

  const laneOptions = useMemo<ContractsVNext.AdminReviewLaneVNext[]>(
    () => ['NEW', 'IN_REVIEW', 'APPROVED', 'REJECTED'],
    [],
  );
  const priorityOptions = useMemo<ContractsVNext.AdminReviewPriorityVNext[]>(
    () => ['LOW', 'MED', 'HIGH', 'EXPEDITE'],
    [],
  );

  const {
    data,
    stats,
    filters,
    isLoading,
    isFetching,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useAdminQuotesList();

  const selectedLanes = useMemo(() => toArray(filters.lane), [filters.lane]);
  const selectedPriorities = useMemo(() => toArray(filters.priority), [filters.priority]);
  const assigneeValue = useMemo(() => {
    const values = toArray(filters.assignee);
    return values[0] ?? '';
  }, [filters.assignee]);

  const assigneeOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const row of data) {
      if (row.assignee) {
        unique.add(row.assignee);
      }
    }
    if (assigneeValue) {
      unique.add(assigneeValue);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [assigneeValue, data]);

  useEffect(() => {
    setSearchValue(searchParams?.get('search') ?? '');
  }, [searchParams]);

  const applyParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      updater(params);
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
        params.delete('cursor');
      });
    },
    [applyParams, searchValue],
  );

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    applyParams((params) => {
      params.delete('search');
      params.delete('cursor');
    });
  }, [applyParams]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  const toggleLane = useCallback(
    (lane: ContractsVNext.AdminReviewLaneVNext) => {
      applyParams((params) => {
        const existing = params.getAll('lane');
        params.delete('lane');
        const next = existing.includes(lane)
          ? existing.filter((value) => value !== lane)
          : [...existing, lane];
        for (const value of next) {
          params.append('lane', value);
        }
        params.delete('cursor');
      });
    },
    [applyParams],
  );

  const togglePriority = useCallback(
    (priority: ContractsVNext.AdminReviewPriorityVNext) => {
      applyParams((params) => {
        const existing = params.getAll('priority');
        params.delete('priority');
        const next = existing.includes(priority)
          ? existing.filter((value) => value !== priority)
          : [...existing, priority];
        for (const value of next) {
          params.append('priority', value);
        }
        params.delete('cursor');
      });
    },
    [applyParams],
  );

  const handleAssigneeChange = useCallback(
    (value: string) => {
      applyParams((params) => {
        params.delete('assignee');
        params.delete('cursor');
        if (value && value !== '__ALL__') {
          params.append('assignee', value);
        }
      });
    },
    [applyParams],
  );

  const handleClearFilters = useCallback(() => {
    applyParams((params) => {
      params.delete('lane');
      params.delete('priority');
      params.delete('assignee');
      params.delete('cursor');
    });
  }, [applyParams]);

  const activeFilters = useMemo(() => {
    const entries: Array<{ label: string; value: string }> = [];
    if (filters.search) {
      entries.push({ label: 'Search', value: filters.search });
    }
    for (const lane of selectedLanes) {
      entries.push({ label: 'Lane', value: lane });
    }
    for (const priority of selectedPriorities) {
      entries.push({ label: 'Priority', value: priority });
    }
    if (assigneeValue) {
      entries.push({ label: 'Assignee', value: assigneeValue });
    }
    return entries;
  }, [assigneeValue, selectedLanes, selectedPriorities, filters.search]);

  const hasResults = data.length > 0;
  const initialLoading = isLoading && !hasResults;

  return (
      <div className="space-y-6 p-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Quotes</h1>
            <p className="text-sm text-muted-foreground">
              Explore every active quote, review status, and drill into details when intervention is required.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center">
              <SearchIcon className="absolute left-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search quotes, customers, companies"
                className="w-72 pl-9"
                aria-label="Search quotes"
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

        <QuoteStatsCards stats={stats} isFetching={isFetching} />

        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Filters</CardTitle>
              <p className="text-xs text-muted-foreground">Refine the quote list by lane, priority, or current assignee.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClearFilters} disabled={!selectedLanes.length && !selectedPriorities.length && !assigneeValue}>
              Clear filters
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Lane</p>
              <div className="flex flex-wrap gap-2">
                {laneOptions.map((lane) => {
                  const selected = selectedLanes.includes(lane);
                  return (
                    <Button
                      key={lane}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      size="sm"
                      aria-pressed={selected}
                      onClick={() => toggleLane(lane)}
                    >
                      {formatLaneLabel(lane)}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Priority</p>
              <div className="flex flex-wrap gap-2">
                {priorityOptions.map((priority) => {
                  const selected = selectedPriorities.includes(priority);
                  return (
                    <Button
                      key={priority}
                      type="button"
                      variant={selected ? 'default' : 'outline'}
                      size="sm"
                      aria-pressed={selected}
                      onClick={() => togglePriority(priority)}
                    >
                      {priority}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assignee</p>
              <div className="w-full max-w-xs">
                <Select value={assigneeValue || '__ALL__'} onValueChange={handleAssigneeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All assignees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__ALL__">All assignees</SelectItem>
                    {assigneeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {activeFilters.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wide">Active filters</span>
            {activeFilters.map((entry) => (
              <Badge key={`${entry.label}-${entry.value}`} variant="outline" className="bg-muted/50 text-xs">
                {entry.label}: {entry.value}
              </Badge>
            ))}
          </div>
        ) : null}

        {isError ? (
          <ErrorState error={error} onRetry={handleRefresh} />
        ) : initialLoading ? (
          <LoadingState />
        ) : (
          <AdminQuotesTable
            rows={data}
            isFetching={isFetching}
            hasNextPage={hasNextPage}
            onLoadMore={handleLoadMore}
          />
        )}
      </div>
  );
}

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function formatLaneLabel(lane: ContractsVNext.AdminReviewLaneVNext): string {
  switch (lane) {
    case 'NEW':
      return 'Needs Triage';
    case 'IN_REVIEW':
      return 'In Review';
    case 'APPROVED':
      return 'Approved';
    case 'REJECTED':
      return 'Blocked';
    default:
      return lane;
  }
}

function LoadingState() {
  return (
    <div className="flex h-48 items-center justify-center rounded border bg-card text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      Loading quotes…
    </div>
  );
}

function ErrorState({ error, onRetry }: { readonly error: Error | null; readonly onRetry: () => void }) {
  return (
    <Card className="border-destructive/40 bg-destructive/10">
      <CardHeader className="flex flex-row items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
        <div>
          <CardTitle className="text-base">Failed to load quotes</CardTitle>
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
