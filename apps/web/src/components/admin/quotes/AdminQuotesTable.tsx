'use client';
/**
 * @module AdminQuotesTable
 * @ownership web/admin
 * @purpose Render the admin quote list with consistent formatting and navigation affordances.
 */

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ContractsVNext } from '@cnc-quote/shared';

type Props = {
  readonly rows: ContractsVNext.AdminReviewItemVNext[];
  readonly isFetching?: boolean;
  readonly hasNextPage?: boolean;
  readonly onLoadMore?: () => void;
};

const priorityVariants: Record<ContractsVNext.AdminReviewPriorityVNext, string> = {
  LOW: 'bg-slate-100 text-slate-700 border border-slate-200',
  MED: 'bg-blue-100 text-blue-800 border border-blue-200',
  HIGH: 'bg-amber-100 text-amber-900 border border-amber-200',
  EXPEDITE: 'bg-red-100 text-red-800 border border-red-200',
};

export function AdminQuotesTable({ rows, isFetching = false, hasNextPage = false, onLoadMore }: Props) {
  const handleLoadMore = () => {
    if (onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <div className="overflow-hidden rounded border bg-card shadow-sm" aria-busy={isFetching && rows.length > 0}>
      <Table>
        <TableCaption className="text-xs text-muted-foreground">
          {isFetching && rows.length === 0 ? 'Loading quotes…' : `${rows.length} quote${rows.length === 1 ? '' : 's'} loaded`}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Quote</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead>Last Action</TableHead>
            <TableHead className="text-right">DFM</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id} className="border-t">
              <TableCell className="font-medium">
                <Link href={`/admin/quotes/${encodeURIComponent(row.quoteId)}`} className="underline-offset-2 hover:underline">
                  {row.quoteNumber ?? row.quoteId}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex flex-col text-sm">
                  <span className="font-medium text-foreground">{row.customerName ?? '—'}</span>
                  <span className="text-xs text-muted-foreground">{row.company ?? '—'}</span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="uppercase">
                  {row.lane.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={priorityVariants[row.priority]}>{row.priority}</Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm">
                {formatCurrency(row.totalValue ?? 0, row.currency ?? 'USD')}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatAbsolute(row.createdAt)}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatAbsolute(row.lastActionAt)}</TableCell>
              <TableCell className="text-right text-sm">{row.dfmFindingCount ?? 0}</TableCell>
            </TableRow>
          ))}

          {rows.length === 0 && !isFetching ? (
            <TableRow>
              <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                No quotes match the current filters.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>

      {hasNextPage ? (
        <div className="flex justify-center border-t bg-muted/40 p-4">
          <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isFetching}>
            {isFetching ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function formatAbsolute(value?: string | null): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
