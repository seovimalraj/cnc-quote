"use client";

import type { ReviewStats } from "@/lib/admin/types";

type Props = {
  readonly stats?: ReviewStats;
  readonly isFetching?: boolean;
};

const currency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });

export default function ReviewStatsCards({ stats, isFetching = false }: Props) {
  const totalValue = stats?.totalValue ?? 0;
  const totalRows = stats?.totalRows ?? 0;
  const conversionRate = stats?.conversionRate ?? 0;

  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-3" aria-busy={isFetching}>
      <KpiCard
        label="Total Quotes"
        value={totalRows.toLocaleString()}
        description="Quotes currently in manual review"
        data-testid="kpi-total-quotes"
      />
      <KpiCard
        label="Pipeline Value"
        value={currency.format(totalValue)}
        description="Total potential revenue"
        data-testid="kpi-total-value"
      />
      <KpiCard
        label="Conversion"
        value={`${(conversionRate * 100).toFixed(1)}%`}
        description="Won quotes vs reviewed"
        data-testid="kpi-conversion"
      />
    </section>
  );
}

type KpiProps = {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
  readonly "data-testid"?: string;
};

function KpiCard({ label, value, description, "data-testid": dataTestId }: KpiProps) {
  return (
    <article
      className="rounded border bg-card p-4 shadow-sm"
      data-testid={dataTestId}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      {description && (
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      )}
    </article>
  );
}
