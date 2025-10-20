'use client';
/**
 * @module AdminReviewDetailPage
 * @ownership web/admin
 * @purpose Present the manual review workspace with live contract-backed data and actionable controls for analysts.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, Loader2, RefreshCw } from 'lucide-react';

import { RequireAnyRole } from '@/components/auth/RequireAnyRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useAdminReviewDetail } from '@/hooks/useAdminReviewDetail';
import {
  acknowledgeReviewDfmFinding,
  assignReviewTicket,
  moveReviewTicket,
} from '@/lib/admin/api';
import type { AdminReviewItem } from '@/lib/admin/types';

const laneOptions: Array<{ value: AdminReviewItem['lane']; label: string }> = [
  { value: 'NEW', label: 'Needs triage' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Blocked' },
];

const priorityBadgeClasses: Record<AdminReviewItem['priority'], string> = {
  LOW: 'bg-muted text-foreground',
  MED: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-amber-100 text-amber-800',
  EXPEDITE: 'bg-red-100 text-red-700',
};

const severityBadgeClasses: Record<'LOW' | 'MED' | 'HIGH', string> = {
  LOW: 'bg-muted text-foreground',
  MED: 'bg-amber-100 text-amber-800',
  HIGH: 'bg-red-100 text-red-700',
};

export default function AdminReviewDetailPage() {
  const params = useParams<{ quoteId: string }>();
  const quoteId = params?.quoteId ?? '';
  const { toast } = useToast();
  const { detail, isLoading, isFetching, isError, error, refetch } = useAdminReviewDetail(quoteId);

  const item = detail?.item;
  const workspace = detail?.workspace;
  const [assigneeInput, setAssigneeInput] = useState('');
  const [laneValue, setLaneValue] = useState<AdminReviewItem['lane']>('NEW');
  const [assigning, setAssigning] = useState(false);
  const [updatingLane, setUpdatingLane] = useState(false);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  useEffect(() => {
    setAssigneeInput(item?.assignee ?? '');
    setLaneValue(item?.lane ?? 'NEW');
  }, [item?.assignee, item?.lane]);

  const quoteNumber = item ? item.quoteNumber ?? item.quoteNo ?? item.quoteId : quoteId;
  const currency = workspace?.pricingSummary.currency ?? item?.currency ?? 'USD';

  const dfmStats = useMemo(() => {
    if (!workspace) {
      return { high: 0, med: 0, low: 0 } as const;
    }
    return workspace.dfm.reduce(
      (acc, issue) => {
        if (issue.severity === 'HIGH') acc.high += 1;
        else if (issue.severity === 'MED') acc.med += 1;
        else acc.low += 1;
        return acc;
      },
      { high: 0, med: 0, low: 0 },
    ) as const;
  }, [workspace]);

  const handleAssign = useCallback(async () => {
    if (!item) {
      return;
    }
    const assignee = assigneeInput.trim();
    if (!assignee) {
      toast({
        title: 'Assignment requires a user',
        description: 'Provide a user identifier before assigning the ticket.',
        variant: 'destructive',
      });
      return;
    }

    setAssigning(true);
    try {
      await assignReviewTicket(item.id, assignee);
      toast({ title: 'Ticket assigned', description: `Assigned to ${assignee}.` });
      refetch();
    } catch (assignError) {
      const message = assignError instanceof Error ? assignError.message : 'Unable to assign ticket';
      toast({ title: 'Assignment failed', description: message, variant: 'destructive' });
    } finally {
      setAssigning(false);
    }
  }, [assigneeInput, item, refetch, toast]);

  const handleLaneChange = useCallback(
    async (nextLane: AdminReviewItem['lane']) => {
      if (!item || nextLane === item.lane) {
        setLaneValue(item?.lane ?? 'NEW');
        return;
      }

      setUpdatingLane(true);
      try {
        await moveReviewTicket(item.id, nextLane);
        setLaneValue(nextLane);
        toast({ title: 'Lane updated', description: `Ticket moved to ${nextLane.replace('_', ' ').toLowerCase()}.` });
        refetch();
      } catch (moveError) {
        const message = moveError instanceof Error ? moveError.message : 'Unable to move ticket';
        toast({ title: 'Lane change failed', description: message, variant: 'destructive' });
        setLaneValue(item.lane);
      } finally {
        setUpdatingLane(false);
      }
    },
    [item, refetch, toast],
  );

  const handleAcknowledge = useCallback(
    async (findingId: string) => {
      if (!item) {
        return;
      }

      setAcknowledgingId(findingId);
      try {
        await acknowledgeReviewDfmFinding(item.quoteId, findingId);
        toast({ title: 'Finding acknowledged', description: 'Marked as reviewed.' });
        refetch();
      } catch (ackError) {
        const message = ackError instanceof Error ? ackError.message : 'Unable to acknowledge finding';
        toast({ title: 'Action failed', description: message, variant: 'destructive' });
      } finally {
        setAcknowledgingId(null);
      }
    },
    [item, refetch, toast],
  );

  if (!quoteId) {
    return <div className="p-6 text-sm text-destructive">Quote identifier is required.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        Loading review workspace…
      </div>
    );
  }

  if (isError || !item || !workspace) {
    return (
      <div className="p-6">
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader className="flex flex-row items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            <div>
              <CardTitle className="text-base">Unable to load review detail</CardTitle>
              <p className="text-xs text-destructive/80">{error?.message ?? 'Please try again.'}</p>
            </div>
          </CardHeader>
          <CardContent>
            <Button type="button" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <RequireAnyRole
      roles={['admin', 'org_admin', 'reviewer', 'finance']}
      fallback={<div className="p-6 text-sm text-destructive">Access denied</div>}
    >
      <div className="space-y-6 p-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Button asChild variant="ghost" size="sm" className="px-2">
              <Link href="/admin/review" className="inline-flex items-center gap-1">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back to queue
              </Link>
            </Button>
            <span className="text-xs uppercase tracking-wide">Quote</span>
            <span className="font-medium text-foreground">{quoteNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="uppercase">
              {item.lane.replace('_', ' ')}
            </Badge>
            <Badge className={priorityBadgeClasses[item.priority]}>{item.priority}</Badge>
            <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-base font-semibold text-foreground">{item.customerName ?? '—'}</p>
                <p className="text-xs text-muted-foreground">{item.company ?? '—'}</p>
              </div>
              <Separator />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Submitted</span>
                <span>{formatAbsolute(item.createdAt)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Last action</span>
                <span>{formatAbsolute(item.lastActionAt)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Assignee</span>
                <span>{item.assignee ?? 'Unassigned'}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>DFM findings</span>
                <span>{item.dfmFindingCount ?? 0}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Financial Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Line items</span>
                <span>{item.totalItems}</span>
              </div>
              <div className="flex justify-between">
                <span>Total value</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(item.totalValue ?? 0, item.currency ?? currency)}
                </span>
              </div>
              <Separator />
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Pricing summary</p>
                <ul className="space-y-0.5 text-foreground">
                  <li className="flex justify-between">
                    <span>Material</span>
                    <span>{formatCurrency(workspace.pricingSummary.materialCost ?? 0, currency)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Machining</span>
                    <span>{formatCurrency(workspace.pricingSummary.machiningCost ?? 0, currency)}</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Finishing</span>
                    <span>{formatCurrency(workspace.pricingSummary.finishingCost ?? 0, currency)}</span>
                  </li>
                  <li className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatCurrency(workspace.pricingSummary.total ?? 0, currency)}</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Analyst Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <Label htmlFor="assignee-input" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Assign to
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="assignee-input"
                    value={assigneeInput}
                    onChange={(event) => setAssigneeInput(event.target.value)}
                    placeholder="User id or email"
                  />
                  <Button type="button" onClick={handleAssign} disabled={assigning}>
                    {assigning ? 'Assigning…' : 'Assign'}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Lane</Label>
                <Select value={laneValue} onValueChange={(value) => handleLaneChange(value as AdminReviewItem['lane'])}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select lane" />
                  </SelectTrigger>
                  <SelectContent>
                    {laneOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {updatingLane ? <p className="text-xs text-muted-foreground">Updating lane…</p> : null}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">DFM Findings</CardTitle>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge className={severityBadgeClasses.HIGH}>High {dfmStats.high}</Badge>
                <Badge className={severityBadgeClasses.MED}>Med {dfmStats.med}</Badge>
                <Badge className={severityBadgeClasses.LOW}>Low {dfmStats.low}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {workspace.dfm.length === 0 ? (
                <p className="text-muted-foreground">No outstanding DFM issues for this quote.</p>
              ) : (
                workspace.dfm.map((issue) => (
                  <div key={issue.id} className="rounded border bg-muted/20 p-3">
                    <div className="flex items-center justify-between">
                      <Badge className={severityBadgeClasses[issue.severity ?? 'LOW']}>{issue.severity ?? 'LOW'}</Badge>
                      <span className="text-xs text-muted-foreground">{issue.rule ?? '—'}</span>
                    </div>
                    <p className="mt-2 text-sm text-foreground">{issue.message}</p>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{issue.partId ? `Part ${issue.partId}` : 'Unmapped part'}</span>
                      <span>{formatAbsolute(issue.createdAt)}</span>
                    </div>
                    <div className="mt-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAcknowledge(issue.id)}
                        disabled={acknowledgingId === issue.id}
                      >
                        {acknowledgingId === issue.id ? 'Acknowledging…' : 'Mark resolved'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {workspace.activity.length === 0 ? (
                <p className="text-muted-foreground">No activity recorded yet.</p>
              ) : (
                workspace.activity.map((event) => (
                  <div key={event.id} className="rounded border bg-muted/20 p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{event.actor ?? 'System'}</span>
                      <span>{formatAbsolute(event.at)}</span>
                    </div>
                    <p className="mt-1 font-medium text-foreground">{event.action.replace('_', ' ')}</p>
                    {event.meta ? (
                      <pre className="mt-2 overflow-x-auto rounded bg-background p-2 text-[11px] text-muted-foreground">
                        {JSON.stringify(event.meta, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {workspace.notes.length === 0 ? (
              <p className="text-muted-foreground">No analyst notes captured for this ticket.</p>
            ) : (
              workspace.notes.map((note) => (
                <div key={note.id} className="rounded border bg-muted/10 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{note.author ?? 'Analyst'}</span>
                    <span>{formatAbsolute(note.at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{note.text ?? '—'}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </RequireAnyRole>
  );
}

function formatCurrency(value: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}

function formatAbsolute(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
