"use client";

import React, { useEffect, useState } from "react";
import { ContractsV1 } from "@cnc-quote/shared";

type AdvisoryPayload = {
  quoteId: string;
  advisory: ContractsV1.QuoteRationaleSummaryV1;
  costSheet: ContractsV1.QuoteRationaleCostSheetV1;
};

interface QuoteRationaleAdvisoryProps {
  quoteId: string;
  apiBaseUrl?: string;
}

interface AdvisoryState {
  status: "idle" | "loading" | "ready" | "error" | "empty";
  payload?: AdvisoryPayload;
  error?: string;
}

export const QuoteRationaleAdvisory: React.FC<QuoteRationaleAdvisoryProps> = ({ quoteId, apiBaseUrl }) => {
  const [state, setState] = useState<AdvisoryState>({ status: "idle" });
  const baseUrl = apiBaseUrl?.replace(/\/$/, "") ?? process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");

  useEffect(() => {
    if (!quoteId || !baseUrl) {
      setState({ status: "empty" });
      return;
    }

    let canceled = false;
    setState({ status: "loading" });

    const fetchAdvisory = async () => {
      try {
        const response = await fetch(`${baseUrl}/price/quotes/${quoteId}/rationale`, {
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        });

        if (canceled) return;

        if (response.status === 404) {
          setState({ status: "empty" });
          return;
        }

        if (!response.ok) {
          throw new Error(`Unexpected status ${response.status}`);
        }

        const payload = (await response.json()) as AdvisoryPayload;
        setState({ status: "ready", payload });
      } catch (error) {
        if (!canceled) {
          setState({ status: "error", error: (error as Error).message });
        }
      }
    };

    fetchAdvisory();

    return () => {
      canceled = true;
    };
  }, [quoteId, baseUrl]);

  if (state.status === "loading") {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold uppercase tracking-wide text-xs text-amber-600">Advisory</p>
        <p className="mt-2 animate-pulse text-amber-700">Preparing rationale summary…</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-semibold uppercase tracking-wide text-xs text-red-600">Advisory</p>
        <p className="mt-2">Unable to load pricing rationale. {state.error}</p>
      </div>
    );
  }

  if (state.status !== "ready" || !state.payload) {
    return null;
  }

  const { advisory } = state.payload;

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
        <span>Advisory</span>
        {advisory.modelVersion ? <span className="text-amber-500">∙ {advisory.modelVersion}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed">
        {advisory.summaryText}
      </p>
      {advisory.breakdownHighlights?.length ? (
        <ul className="mt-3 space-y-1 text-xs text-amber-800">
          {advisory.breakdownHighlights.slice(0, 6).map((highlight, index) => (
            <li key={`${highlight.category}-${index}`}>
              <span className="font-semibold capitalize">{highlight.category.replace(/_/g, ' ')}:</span>{' '}
              {highlight.description}
              {typeof highlight.amountImpact === 'number' ? ` (Δ $${highlight.amountImpact.toFixed(2)})` : ''}
              {typeof highlight.percentImpact === 'number' ? ` [${highlight.percentImpact.toFixed(1)}%]` : ''}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-3 text-xs text-amber-700">
        Generated {new Date(advisory.generatedAt).toLocaleString()} • Trace {advisory.traceId ?? 'n/a'}
      </div>
    </div>
  );
};
