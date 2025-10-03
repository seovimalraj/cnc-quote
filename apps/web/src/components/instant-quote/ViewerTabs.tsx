"use client";

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { DfmSelectionHint } from '@cnc-quote/shared';
import DfmPanel from '../../components/DfmPanel';
import { useInstantQuoteState } from './InstantQuoteState';

const Canvas3D = dynamic(() => import('../Canvas3D').then(mod => ({ default: mod.Canvas3D })), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-xs text-gray-500">
      Loading viewer…
    </div>
  ),
});

interface ViewerTabsProps {
  part: { id: string; file_id?: string; config_json?: any; dfm_json?: any };
  dfmEvent?: any;
}

interface DfmIssueForUi {
  id: string;
  name?: string;
  message?: string;
  severity?: string;
  suggestion?: string;
  selection_hint?: DfmSelectionHint;
  source?: 'summary' | 'event' | 'patch';
}

function deriveIssues(part: ViewerTabsProps['part'], dfmEvent?: any): DfmIssueForUi[] {
  const issues: DfmIssueForUi[] = [];
  const summaryIssues = Array.isArray(part?.dfm_json?.issues) ? part.dfm_json.issues : [];
  summaryIssues.forEach((issue: any, index: number) => {
    const id = String(issue?.rule_id || issue?.id || `${part.id}-summary-${index}`);
    issues.push({
      id,
      name: issue?.name ?? issue?.title,
      message: issue?.message ?? issue?.description,
      severity: issue?.severity,
      suggestion: issue?.suggestion ?? issue?.suggested_fix,
      selection_hint: issue?.selection_hint,
      source: 'summary',
    });
  });

  const payload = dfmEvent?.payload ?? dfmEvent;
  const payloadMatchesPart = payload?.quote_item_id ? payload.quote_item_id === part.id : true;
  if (payloadMatchesPart) {
    if (Array.isArray(payload?.issues)) {
      payload.issues.forEach((issue: any, index: number) => {
        const id = String(issue?.rule_id || issue?.id || `${part.id}-event-${index}`);
        issues.push({
          id,
          name: issue?.name ?? issue?.title,
          message: issue?.message,
          severity: issue?.severity,
          suggestion: issue?.suggestion,
          selection_hint: issue?.selection_hint,
          source: 'event',
        });
      });
    }
    if (Array.isArray(payload?.issues_patches)) {
      payload.issues_patches.forEach((patch: any, index: number) => {
        const id = String(patch?.rule_id || patch?.id || `${part.id}-patch-${index}`);
        issues.push({
          id,
          name: patch?.name,
          message: patch?.message,
          severity: patch?.severity,
          suggestion: patch?.suggested_fix,
          selection_hint: patch?.selection_hint,
          source: 'patch',
        });
      });
    }
  }

  // Deduplicate by id preferring entries with selection hints
  const byId = new Map<string, DfmIssueForUi>();
  for (const issue of issues) {
    const existing = byId.get(issue.id);
    if (!existing) {
      byId.set(issue.id, issue);
      continue;
    }
    const existingHasHint = !!existing.selection_hint?.triangle_indices?.length;
    const nextHasHint = !!issue.selection_hint?.triangle_indices?.length;
    if (nextHasHint && !existingHasHint) {
      byId.set(issue.id, { ...existing, ...issue });
    } else {
      byId.set(issue.id, { ...existing, ...issue, selection_hint: existing.selection_hint ?? issue.selection_hint });
    }
  }

  return Array.from(byId.values());
}

function pickHighlightColor(severity?: string) {
  const normalized = (severity ?? '').toLowerCase();
  if (normalized === 'block' || normalized === 'critical') return '#ef4444';
  if (normalized === 'warn' || normalized === 'warning' || normalized === 'medium') return '#f97316';
  return '#22d3ee';
}

export function ViewerTabs({ part, dfmEvent }: Readonly<ViewerTabsProps>) {
  const { activeTab, setActiveTab } = useInstantQuoteState();
  const issues = useMemo(() => deriveIssues(part, dfmEvent), [part, dfmEvent]);
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setSelectedIssueId(undefined);
  }, [part.id]);

  useEffect(() => {
    if (!issues.length) {
      if (selectedIssueId !== undefined) {
        setSelectedIssueId(undefined);
      }
      return;
    }
    if (selectedIssueId && issues.some(issue => issue.id === selectedIssueId)) {
      return;
    }
    const defaultIssue = issues.find(issue => issue.selection_hint?.triangle_indices?.length) ?? issues[0];
    setSelectedIssueId(defaultIssue?.id);
  }, [issues, selectedIssueId]);

  const selectedIssue = useMemo(() => issues.find(issue => issue.id === selectedIssueId), [issues, selectedIssueId]);
  const meshUrl = useMemo(() => (part?.id ? `/api/geometry/${encodeURIComponent(part.id)}/mesh?lod=low` : null), [part]);
  const fallbackHint = useMemo(() => issues.find(issue => issue.selection_hint?.triangle_indices?.length)?.selection_hint, [issues]);
  const meshVersion = selectedIssue?.selection_hint?.mesh_version ?? fallbackHint?.mesh_version;
  const highlightColor = pickHighlightColor(selectedIssue?.severity);

  const selectedIssueForCanvas = selectedIssue?.selection_hint
    ? {
        id: selectedIssue.id,
        label: selectedIssue.name ?? selectedIssue.message ?? selectedIssue.id,
        selection_hint: selectedIssue.selection_hint,
      }
    : undefined;

  return (
    <div className="flex flex-col h-full rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="flex text-xs font-medium border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
        <button
          type="button"
          onClick={() => setActiveTab('viewer')}
          className={`px-3 py-2 border-r border-gray-100 dark:border-gray-800 ${activeTab === 'viewer' ? 'bg-white dark:bg-gray-900 text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-900/40'}`}
        >3D VIEW</button>
        <button
          type="button"
          onClick={() => setActiveTab('dfm')}
          className={`px-3 py-2 ${activeTab === 'dfm' ? 'bg-white dark:bg-gray-900 text-blue-600' : 'text-gray-600 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-gray-900/40'}`}
        >DFM</button>
      </div>
      <div className="flex-1 min-h-[300px] relative">
        {activeTab === 'viewer' && (
          <div className="absolute inset-0">
            <Canvas3D
              meshUrl={meshUrl}
              meshVersion={meshVersion}
              selectedIssue={selectedIssueForCanvas}
              highlightColor={highlightColor}
              className="h-full"
            />
            {!issues.length && (
              <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 bg-white/80 dark:bg-gray-900/80 px-2 py-1 rounded">
                No DFM issues yet
              </div>
            )}
          </div>
        )}
        {activeTab === 'dfm' && (
          <div className="absolute inset-0 overflow-auto p-3">
            <DfmPanel
              dfm={dfmEvent ?? part.dfm_json}
              issues={issues}
              selectedIssueId={selectedIssueId}
              onSelectIssue={setSelectedIssueId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
