"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { AdminTableRow, PageMeta } from "@/lib/admin/types";

type SortState = {
  readonly sort?: string;
  readonly order?: "asc" | "desc";
};

type Props = {
  readonly rows: AdminTableRow[];
  readonly meta?: PageMeta;
  readonly isFetching?: boolean;
  readonly currentSort?: SortState;
  readonly onSortChange?: (state: SortState) => void;
  readonly onLoadMore?: () => void;
  readonly className?: string;
  readonly "data-testid"?: string;
};

const columns: Array<{
  readonly id: string;
  readonly label: string;
  readonly sortable?: boolean;
  readonly align?: "left" | "right";
}> = [
  { id: "quoteNo", label: "Quote #", sortable: true },
  { id: "customer", label: "Customer" },
  { id: "createdAt", label: "Submitted", sortable: true },
  { id: "lane", label: "Lane" },
  { id: "priority", label: "Priority" },
  { id: "totalValue", label: "Total", sortable: true, align: "right" },
  { id: "assignee", label: "Assignee" },
  { id: "dfmFindingCount", label: "DFM Findings", align: "right" }
];

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export default function AdminReviewTable({
  rows,
  meta,
  isFetching = false,
  currentSort,
  onSortChange,
  onLoadMore,
  className,
  ...rest
}: Props) {
  const hasMore = Boolean(meta?.nextCursor);

  const sortState = useMemo(() => ({
    column: currentSort?.sort,
    order: currentSort?.order ?? "asc"
  }), [currentSort?.order, currentSort?.sort]);

  const handleSort = (column: string, sortable?: boolean) => {
    if (!sortable || !onSortChange) {
      return;
    }

    const isSameColumn = sortState.column === column;
    const nextOrder = isSameColumn && sortState.order === "asc" ? "desc" : "asc";
    onSortChange({ sort: column, order: nextOrder });
  };

  return (
  <div className={classes("overflow-hidden rounded border", className)} aria-busy={isFetching && rows.length > 0} {...rest}>
      <table className="w-full border-collapse text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wide text-foreground/70">
          <tr>
            {columns.map((column) => {
              const isSorted = sortState.column === column.id;
              const nextOrder = isSorted && sortState.order === "asc" ? "desc" : "asc";
              let indicator = nextOrder === "asc" ? "△" : "▽";

              if (isSorted) {
                indicator = sortState.order === "asc" ? "▲" : "▼";
              }

              return (
                <th
                  key={column.id}
                  scope="col"
                  className={classes(
                    "whitespace-nowrap px-4 py-3 text-left font-semibold",
                    column.align === "right" && "text-right",
                    column.sortable && "cursor-pointer select-none"
                  )}
                  onClick={() => handleSort(column.id, column.sortable)}
                >
                  <span className="inline-flex items-center gap-1">
                    {column.label}
                    {column.sortable && (
                      <span className="text-[10px] text-foreground/50">
                        {indicator}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t bg-background">
              <td className="px-4 py-3 font-medium">
                <Link href={`/admin/review/${row.quoteNo}`} className="underline-offset-2 hover:underline">
                  {row.quoteNo}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span>{row.customerName}</span>
                  <span className="text-xs text-foreground/60">{row.company}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                {new Date(row.createdAt).toLocaleString()}
              </td>
              <td className="px-4 py-3">{row.lane}</td>
              <td className="px-4 py-3">{row.priority}</td>
              <td className="px-4 py-3 text-right">
                {Intl.NumberFormat(undefined, { style: "currency", currency: row.currency }).format(row.totalValue)}
              </td>
              <td className="px-4 py-3">{row.assignee ?? "Unassigned"}</td>
              <td className="px-4 py-3 text-right">{row.dfmFindingCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {hasMore && (
        <div className="flex justify-center border-t bg-muted/40 p-4">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetching}
            className="rounded border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isFetching ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
