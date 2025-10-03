"use client";
import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRealtimePricing } from '../../hooks/useRealtimePricing';
import GeometryPanel from '../../components/GeometryPanel';
import { InstantQuoteStateProvider } from '../../components/instant-quote/InstantQuoteState';
import { PartListPanel } from '../../components/instant-quote/PartListPanel';
import { SelectedPartWorkspace } from '../../components/instant-quote/SelectedPartWorkspace';
import { QuoteSummaryPanel } from '../../components/instant-quote/QuoteSummaryPanel';

interface QuoteSummaryItem { id: string; file_id?: string; config_json?: any; pricing_matrix?: any[]; dfm_json?: any; }

export default function InstantQuotePage() {
  const { geometry, dfm, joinQuote, recalcItem, quoteId: activeQuoteId } = useRealtimePricing({ autoConnect: true });
  const [quoteId, setQuoteId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<QuoteSummaryItem[]>([]);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const fetchSummary = useCallback(async (id: string) => {
    setLoadingQuote(true);
    try {
      const res = await fetch(`/api/quotes/${id}/summary`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.parts || data.items || []);
      }
    } finally {
      setLoadingQuote(false);
    }
  }, []);

  const handleQuoteReady = useCallback((id: string) => {
    setQuoteId(id);
    joinQuote(id);
    fetchSummary(id);
  }, [fetchSummary, joinQuote]);

  const handleUploaded = useCallback((ctx: { quote_id?: string }) => {
    if (ctx.quote_id && ctx.quote_id !== quoteId) {
      handleQuoteReady(ctx.quote_id);
    } else if (ctx.quote_id) {
      fetchSummary(ctx.quote_id);
    }
  }, [fetchSummary, handleQuoteReady, quoteId]);

  const triggerRecalc = useCallback((partId: string, cfg: any) => {
    const id = quoteId || activeQuoteId;
    if (!id) return;
    recalcItem(id, partId, cfg);
  }, [quoteId, activeQuoteId, recalcItem]);

  return (
    <InstantQuoteStateProvider>
      <div className="h-full flex flex-col">
        <header className="border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between bg-white dark:bg-gray-900" data-test="iq-header">
          <h1 className="text-lg font-semibold" data-test="iq-title">Instant Quote</h1>
          <Link href="/quotes" className="text-sm text-blue-600 hover:underline">My Quotes</Link>
        </header>
        <main className="flex-1 overflow-hidden grid gap-4 p-4 xl:grid-cols-12 layout-iq">
          {/* Left Column */}
          <div className="xl:col-span-3 h-full min-h-0 flex flex-col sticky top-[56px] self-start" data-test="iq-left">
            <PartListPanel
              parts={items}
              loading={loadingQuote}
              orgId="demo-org"
              onQuoteReady={handleQuoteReady}
              onUploaded={handleUploaded}
            />
          </div>
          {/* Center Column */}
          <div className="xl:col-span-6 min-h-0 overflow-auto pr-1 space-y-4" data-test="iq-center">
            <SelectedPartWorkspace
              parts={items}
              quoteId={quoteId || activeQuoteId}
              onRecalc={triggerRecalc}
              dfm={dfm}
            />
          </div>
          {/* Right Column */}
          <div className="xl:col-span-3 h-full min-h-0 flex flex-col sticky top-[56px] self-start" data-test="iq-summary">
            <div className="space-y-4">
              <GeometryPanel geometry={geometry} />
              <QuoteSummaryPanel parts={items} />
            </div>
          </div>
        </main>
      </div>
    </InstantQuoteStateProvider>
  );
}