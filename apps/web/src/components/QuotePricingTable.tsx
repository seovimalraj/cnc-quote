"use client";
import React, { useEffect, useMemo, useRef } from 'react';
import { usePricingStore } from '../store/pricingStore';
import clsx from 'clsx';
import { ComplianceBadge } from './instant-quote/ComplianceBadge';
import { formatCurrency } from '@/lib/format';

interface Props {
  quoteItemId: string;
  currency?: string;
  onRecalc?: (quoteItemId: string) => void;
}

export const QuotePricingTable: React.FC<Props> = ({ quoteItemId, currency = 'USD', onRecalc }) => {
  const item = usePricingStore(s => s.items[quoteItemId]);
  const subtotalDelta = usePricingStore(s => s.lastSubtotalDelta);
  const drift = usePricingStore(s => s.driftDetected);
  const deltaRef = useRef<HTMLSpanElement | null>(null);
  const optimisticCount = useMemo(() => item?.rows.filter(r => r.optimistic || r.status === 'optimistic').length || 0, [item]);
  const latencyClass = useMemo(() => {
    if (!item?.latency_ms) return 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
    if (item.latency_ms < 200) return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
    if (item.latency_ms < 500) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
    return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
  }, [item?.latency_ms]);

  useEffect(() => {
    if (subtotalDelta === undefined) return;
    if (!deltaRef.current) return;
    deltaRef.current.classList.remove('opacity-0');
    deltaRef.current.classList.add(subtotalDelta >= 0 ? 'text-green-600' : 'text-red-600');
    const t = setTimeout(() => {
      if (!deltaRef.current) return;
      deltaRef.current.classList.add('opacity-0');
      deltaRef.current.classList.remove('text-green-600', 'text-red-600');
    }, 1600);
    return () => clearTimeout(t);
  }, [subtotalDelta]);

  if (!item) {
    return (
      <div className="text-sm text-gray-500">
        No pricing yet.
        {onRecalc && <button onClick={() => onRecalc(quoteItemId)} className="ml-2 text-blue-600 underline">Recalculate</button>}
      </div>
    );
  }

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">Pricing – Item {quoteItemId.slice(0,8)}</h4>
        <div className="text-xs text-gray-500 flex items-center gap-3">
          <div className="flex items-center gap-2">
            {item.latency_ms !== undefined && (
              <span className={`px-2 py-0.5 rounded-full font-medium ${latencyClass}`}>{item.latency_ms} ms</span>
            )}
            {optimisticCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" title="Pending final pricing updates">{optimisticCount} pending</span>
            )}
            {drift && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 animate-pulse" title="Drift detected – auto reconciliation running">drift</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRecalc && <button onClick={() => onRecalc(quoteItemId)} className="text-blue-600 hover:underline">Recalc</button>}
          </div>
        </div>
      </div>
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800/50">
            <th className="text-left p-2 font-medium">Qty</th>
            <th className="text-right p-2 font-medium">Unit</th>
            <th className="text-right p-2 font-medium">Total</th>
            <th className="text-right p-2 font-medium">Lead (d)</th>
            <th className="text-left p-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {item.rows.map(r => {
            const optimistic = r.optimistic || r.status === 'optimistic';
            return (
              <tr key={r.quantity} className={clsx('border-t border-gray-100 dark:border-gray-700 transition-colors', optimistic && 'bg-amber-50 dark:bg-amber-900/20')}> 
                <td className="p-2">{r.quantity}</td>
                <td className="p-2 text-right tabular-nums">{r.unit_price !== undefined ? formatCurrency(r.unit_price, currency) : '—'}</td>
                <td className="p-2 text-right tabular-nums">{r.total_price !== undefined ? formatCurrency(r.total_price, currency) : '—'}</td>
                <td className="p-2 text-right">{r.lead_time_days ?? '—'}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <span>{optimistic ? 'optimistic' : (r.status || 'ready')}</span>
                    {r.compliance?.alerts?.length ? (
                      <ComplianceBadge snapshot={r.compliance} size="xs" />
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <div>
          Version: {item.pricing_version ?? '—'}
        </div>
        <div className="relative min-h-[1rem]">
          <span ref={deltaRef} className="absolute right-0 top-0 opacity-0 transition-opacity duration-500 flex items-center gap-1">
            {subtotalDelta !== undefined && subtotalDelta !== 0 && (
              <>
                <ArrowIcon up={subtotalDelta > 0} />
                <span>{(subtotalDelta > 0 ? '+' : '') + formatCurrency(subtotalDelta, currency)}</span>
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

const ArrowIcon: React.FC<{ up: boolean }> = ({ up }) => (
  <svg
    className={clsx('w-3 h-3', up ? 'text-green-600' : 'text-red-600 rotate-180')}
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path fillRule="evenodd" d="M10 3a1 1 0 01.832.445l5 7a1 1 0 01-1.664 1.11L10 5.882 5.832 11.555a1 1 0 01-1.664-1.11l5-7A1 1 0 0110 3z" clipRule="evenodd" />
  </svg>
);
