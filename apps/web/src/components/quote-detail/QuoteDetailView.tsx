"use client";

import React, { useState, useEffect } from 'react';
import { useRealtimePricing } from '@/hooks/useRealtimePricing';
import { createClient } from '@/lib/supabase/client';

interface QuoteDetailViewProps {
  quoteId: string;
}

// Minimal placeholder state until the portal quote page is the primary UI
const mockQuoteData = { id: '', created_at: new Date().toISOString(), status: 'processing' as const, parts: [], subtotal: 0, shipping: 0, tax: 0, total: 0, xometry_price: 0 };

export function QuoteDetailView({ quoteId }: QuoteDetailViewProps) {
  const [quote, setQuote] = useState({ ...mockQuoteData, id: quoteId });
  const [loading, setLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | undefined>(undefined);
  const [orgId, setOrgId] = useState<string | undefined>(undefined);
  const { joinQuote } = useRealtimePricing({ baseUrl: process.env.NEXT_PUBLIC_API_URL, authToken, orgId, autoReconcileOnDrift: true });

  useEffect(() => {
    // TODO: Fetch real quote data from API
    const fetchQuote = async () => {
      try {
        // const response = await api.get(`/quotes/${quoteId}`);
        // setQuote(response.data);
        setQuote({ ...mockQuoteData, id: quoteId });
      } catch (error) {
        console.error('Failed to fetch quote:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [quoteId]);

  useEffect(() => {
    // Fetch Supabase session token and org context; then join pricing channel for this quote
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session ?? null;
      const token = session?.access_token;
      const appMeta: any = session?.user?.app_metadata || {};
      const userMeta: any = session?.user?.user_metadata || {};
      const oid: string | undefined = appMeta.org_id || userMeta.org_id || undefined;
      if (token) setAuthToken(token);
      if (oid) setOrgId(oid);
    }).catch(() => { /* noop */ });
  }, []);

  useEffect(() => {
    if (quoteId) {
      joinQuote(quoteId);
    }
  }, [quoteId, joinQuote]);

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Loading quote {quoteId}…</div>;
  }
  return <div className="p-6 text-sm text-gray-500">Quote {quote.id} is loading in the portal view…</div>;
}
