"use client";
import React, { useMemo } from 'react';
import PartConfigForm from '../../components/PartConfigForm';
import { QuotePricingTable } from '../../components/QuotePricingTable';
import { ViewerTabs } from './ViewerTabs';
import { useInstantQuoteState } from './InstantQuoteState';

interface SelectedPartWorkspaceProps {
  parts: Array<{ id: string; file_id?: string; config_json?: any; dfm_json?: any }>;
  quoteId?: string;
  onRecalc: (partId: string, cfg: any) => void;
  dfm?: any;
}

export function SelectedPartWorkspace({ parts, quoteId, onRecalc, dfm }: Readonly<SelectedPartWorkspaceProps>) {
  const { selectedPartId } = useInstantQuoteState();
  const active = useMemo(() => parts.find(p => p.id === selectedPartId), [parts, selectedPartId]);

  if (!parts.length) {
    return <div className="text-xs text-gray-500 p-6 border border-dashed rounded">Upload parts to begin.</div>;
  }
  if (!active) {
    return <div className="text-xs text-gray-500 p-6 border border-dashed rounded">Select a part on the left to configure.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <ViewerTabs
        part={active}
        dfmEvent={dfm}
      />
      <div className="grid md:grid-cols-2 gap-4 items-start">
        <div className="rounded border border-gray-200 dark:border-gray-700 p-4" data-test="config-panel">
          <h3 className="text-xs font-semibold text-gray-500 mb-3">CONFIGURATION</h3>
          {/* NOTE(Future): Add lead time selector and risk/inspection options controlling pricing ladders */}
          <PartConfigForm
            quoteId={quoteId || ''}
            partId={active.id}
            config={active.config_json || { id: active.id }}
            onRecalc={cfg => onRecalc(active.id, cfg)}
          />
        </div>
        <div className="rounded border border-gray-200 dark:border-gray-700 p-4" data-test="pricing-panel">
          <h3 className="text-xs font-semibold text-gray-500 mb-3">PRICING</h3>
          {/* NOTE(Future): Introduce quantity ladder editing & bulk copy across parts */}
          <QuotePricingTable quoteItemId={active.id} />
        </div>
      </div>
    </div>
  );
}
