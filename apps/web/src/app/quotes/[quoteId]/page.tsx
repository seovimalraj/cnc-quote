"use client";
import React, { useEffect } from 'react';
import { useRealtimePricing } from '../../../hooks/useRealtimePricing';
import { QuotePricingTable } from '../../../components/QuotePricingTable';
import { usePricingStore } from '../../../store/pricingStore';
import { QuoteRationaleAdvisory } from '../../../components/QuoteRationaleAdvisory';

interface PageProps {
  params: { quoteId: string };
}

// Placeholder fetch of quote items – in a real implementation you'd fetch from API.
async function fetchQuoteItems(quoteId: string): Promise<string[]> {
  // Replace with real API call; using dummy items for now
  return ["item1", "item2"].map((id, i) => `${quoteId.slice(0,6)}-${i+1}`);
}

const QuoteDetailPage: React.FC<PageProps> = ({ params }) => {
  const { quoteId } = params;
  const { joinQuote, recalcItem, items } = useRealtimePricing({
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    autoReconcileOnDrift: true,
  });
  const setQuoteId = usePricingStore(s => s.setQuoteId);

  useEffect(() => {
    if (!quoteId) return;
    setQuoteId(quoteId);
    joinQuote(quoteId);
    // Initial reconcile fetch (server authoritative)
    // Optionally trigger store.reconcile() here if needed
  }, [quoteId, joinQuote, setQuoteId]);

  const handleRecalc = (qid: string, quoteItemId: string) => {
    recalcItem(qid, quoteItemId);
  };

  const itemIds = Object.keys(items);

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-lg font-semibold">Quote {quoteId}</h2>
      <QuoteRationaleAdvisory quoteId={quoteId} />
      <div className="grid md:grid-cols-2 gap-6">
        {itemIds.length === 0 && (
          <div className="text-sm text-gray-500">Waiting for pricing events...</div>
        )}
        {itemIds.map(id => (
          <QuotePricingTable key={id} quoteItemId={id} onRecalc={(qi) => handleRecalc(quoteId, qi)} />
        ))}
      </div>
    </div>
  );
};

export default QuoteDetailPage;