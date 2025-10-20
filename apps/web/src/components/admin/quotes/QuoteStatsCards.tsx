'use client';
/**
 * @module QuoteStatsCards
 * @ownership web/admin
 * @purpose Present admin quote KPIs with labels tailored to the pipeline overview.
 */

import type { AdminQuotesListResponse } from '@/lib/admin/api';

const currencyFormatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

type Props = {
  readonly stats?: AdminQuotesListResponse['stats'];
  readonly isFetching?: boolean;
};

export function QuoteStatsCards({ stats, isFetching = false }: Props) {
  const totalQuotes = stats?.totalRows ?? 0;
  const totalValue = stats?.totalValue ?? 0;
  const conversionRate = stats?.conversionRate ?? 0;

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-busy={isFetching}>
      <KpiCard
        label="Active Quotes"
        value={totalQuotes.toLocaleString()}
        description="Quotes currently visible in the admin workspace"
      />
      <KpiCard
        label="Pipeline Value"
        value={currencyFormatter.format(totalValue)}
        description="Sum of quote totals across the current filter set"
      />
      <KpiCard
        label="Conversion"
        value={`${(conversionRate * 100).toFixed(1)}%`}
        description="Closed-won share of evaluated quotes"
      />
    </section>
  );
}

type KpiProps = {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
};

function KpiCard({ label, value, description }: KpiProps) {
  return (
    <article className="rounded border bg-card p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
    </article>
  );
}
