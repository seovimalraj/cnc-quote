"use client";
import React, { useMemo } from 'react';
import MultiFileUpload from '../../components/MultiFileUpload';
import { useInstantQuoteState } from './InstantQuoteState';
import { usePricingStore } from '../../store/pricingStore';
import { ComplianceBadge } from './ComplianceBadge';
import { pickWorstAlert } from '../../lib/compliance';

interface PartListPanelProps {
  parts: Array<{ id: string; file_id?: string; status?: string; config_json?: any }>;
  loading?: boolean;
  orgId: string;
  onQuoteReady: (id: string) => void;
  onUploaded: (ctx: { quote_id?: string }) => void;
}

export function PartListPanel({ parts, loading, orgId, onQuoteReady, onUploaded }: PartListPanelProps) {
  const { selectedPartId, selectAndFocus } = useInstantQuoteState();
  const pricingItems = usePricingStore(s => s.items);
  const perPartAlert = useMemo(() => {
    const map: Record<string, ReturnType<typeof pickWorstAlert>> = {};
    for (const part of parts) {
      const pricing = pricingItems[part.id];
      if (!pricing) continue;
      let worst;
      for (const row of pricing.rows) {
        const candidate = pickWorstAlert(row.compliance?.alerts ?? []);
        if (!candidate) continue;
        if (!worst || candidate.rank > worst.rank) {
          worst = candidate;
        }
      }
      if (worst) {
        map[part.id] = worst;
      }
    }
    return map;
  }, [parts, pricingItems]);
  return (
    <div className="flex flex-col gap-4 h-full">
      <MultiFileUpload orgId={orgId} baseUrl="" onQuoteReady={qid => onQuoteReady(qid)} onUploaded={onUploaded} />
      <div className="rounded border border-gray-200 dark:border-gray-700 flex flex-col min-h-0 h-full">
        <div className="p-3 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-xs font-semibold tracking-wide text-gray-500">PARTS</h2>
        </div>
        <ul className="flex-1 overflow-auto px-3 py-2 space-y-1 text-sm" data-test="parts-list">
          {loading && <li className="text-[11px] text-gray-500">Loading…</li>}
          {!loading && parts.length === 0 && <li className="text-[11px] text-gray-500">No parts yet.</li>}
          {parts.map(p => {
            const active = p.id === selectedPartId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => selectAndFocus(p.id)}
                  className={`w-full flex items-center justify-between rounded px-2 py-2 text-left transition-colors border ${active ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600' : 'bg-gray-50 dark:bg-gray-800/40 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/60'}`}
                  data-test={`part-row-${p.id}`}
                >
                  <span className="flex items-center gap-2 truncate max-w-[70%]" title={p.file_id}>
                    <span className="truncate">{p.file_id?.slice(0, 22) || 'part'}</span>
                    {perPartAlert[p.id] ? <ComplianceBadge alert={perPartAlert[p.id]} size="xs" /> : null}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-gray-500">{p.config_json?.pricing?.status || p.status || 'pending'}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
