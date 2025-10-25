"use client";

import React from 'react';
import { QuoteDetailView } from '../../../components/quote-detail/QuoteDetailView';

interface PageProps {
  params: { quoteId: string };
}

export default function QuoteDetailPage({ params }: PageProps) {
  const { quoteId } = params;

  return <QuoteDetailView quoteId={quoteId} />;
}