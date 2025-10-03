"use client";
import React from 'react';
import type { DfmSelectionHint } from '@cnc-quote/shared';

export interface DfmIssue {
  rule_id?: string;
  name?: string;
  severity?: string;
  message?: string;
  details?: any;
  location?: { x: number; y: number; z: number };
  suggestion?: string;
  id?: string;
  status?: string;
  source?: string;
  selection_hint?: DfmSelectionHint;
}

export interface DfmRecommendation {
  type: 'process' | 'material' | 'design' | 'finish';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact?: {
    cost_savings_percent?: number;
    lead_time_reduction_days?: number;
    quality_improvement?: string;
  };
  alternatives?: Array<{
    option: string;
    cost_impact: number;
    feasibility_score: number;
  }>;
}

export interface DfmPanelProps {
  dfm?: any;
  issues?: ReadonlyArray<Partial<DfmIssue>>;
  selectedIssueId?: string;
  onSelectIssue?: (issueId: string | undefined) => void;
  className?: string;
}

const severityColors: Record<string,string> = {
  info: 'text-blue-600',
  warn: 'text-amber-600',
  block: 'text-red-600',
  warning: 'text-amber-600',
  critical: 'text-red-600',
};

const priorityColors: Record<string,string> = {
  high: 'text-red-600',
  medium: 'text-amber-600',
  low: 'text-green-600'
};

export const DfmPanel: React.FC<DfmPanelProps> = ({ dfm, issues: issuesOverride, selectedIssueId, onSelectIssue, className }) => {
  const hasIssuesOverride = Array.isArray(issuesOverride) && issuesOverride.length > 0;
  if (!dfm && !hasIssuesOverride) {
    return <div className={"rounded border border-gray-200 dark:border-gray-700 p-3 text-xs text-gray-500 "+(className||'')}>No DFM results yet.</div>;
  }

  let sourceIssues: ReadonlyArray<Partial<DfmIssue>> = [];
  if (Array.isArray(issuesOverride) && issuesOverride.length > 0) {
    sourceIssues = issuesOverride;
  } else if (Array.isArray(dfm?.issues)) {
    sourceIssues = dfm.issues;
  }

  const normalizedIssues: DfmIssue[] = sourceIssues.map((issue: any, index: number) => {
    const id = String(issue?.id ?? issue?.rule_id ?? `issue-${index}`);
    const severity = issue?.severity ?? issue?.status ?? issue?.level;
    return {
      ...(issue as Partial<DfmIssue>),
      id,
      name: issue?.name ?? issue?.title,
      message: issue?.message ?? issue?.description,
      severity,
      suggestion: issue?.suggestion ?? issue?.suggested_fix,
      selection_hint: issue?.selection_hint,
    } as DfmIssue;
  });

  const manufacturabilityScore: number | undefined = dfm?.manufacturability_score;
  const recommendations: DfmRecommendation[] = Array.isArray(dfm?.recommendations) ? dfm.recommendations : [];
  const costImpact = dfm?.cost_impact_analysis;
  const processRecommendations = Array.isArray(dfm?.process_recommendations) ? dfm.process_recommendations : [];

  const maybeHandleSelect = (issueId: string | undefined) => {
    if (onSelectIssue) {
      onSelectIssue(issueId);
    }
  };

  return (
    <div className={"rounded border border-gray-200 dark:border-gray-700 p-3 "+(className||'')}>
      <h3 className="text-xs font-semibold text-gray-500 mb-2">Design for Manufacturability</h3>

      {/* Manufacturability Score */}
      {manufacturabilityScore !== undefined && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-gray-500">Manufacturability Score:</span>
            <span
              className={(() => {
                let color = 'text-red-600';
                if (manufacturabilityScore >= 80) color = 'text-green-600';
                else if (manufacturabilityScore >= 60) color = 'text-amber-600';
                return `text-xs font-semibold ${color}`;
              })()}
            >
              {manufacturabilityScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className={(() => {
                let color = 'bg-red-500';
                if (manufacturabilityScore >= 80) color = 'bg-green-500';
                else if (manufacturabilityScore >= 60) color = 'bg-amber-500';
                return `h-1.5 rounded-full ${color}`;
              })()}
              style={{ width: `${manufacturabilityScore}%` }}
            />
          </div>
        </div>
      )}

      {/* Cost Impact Analysis */}
      {costImpact && (
        <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded text-[10px]">
          <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Analysis</div>
          <div className="grid grid-cols-2 gap-1">
            <div>Current: ${costImpact.current_estimated_cost?.toFixed(2)}</div>
            <div>Optimized: ${costImpact.optimized_cost?.toFixed(2)}</div>
            <div className="col-span-2 text-green-600">
              Potential Savings: {costImpact.savings_potential_percent?.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Issues */}
      {normalizedIssues.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-gray-500 mb-1">Issues ({normalizedIssues.length})</div>
          <ul className="space-y-1 max-h-32 overflow-auto pr-1 text-[11px]">
            {normalizedIssues.slice(0, 50).map((issue: DfmIssue) => {
              const sev = (issue.severity || 'info').toLowerCase();
              const isSelected = issue.id === selectedIssueId;
              const interactive = typeof onSelectIssue === 'function';
              const baseCls = 'w-full flex items-start gap-2 rounded px-2 py-1 border text-left transition-colors';
              let stateCls = 'border-transparent';
              if (isSelected) {
                stateCls = 'border-blue-400 bg-blue-50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100';
              } else if (interactive) {
                stateCls = 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800/60';
              }
              const severitySymbol = (() => {
                if (sev === 'block' || sev === 'critical') return '●';
                if (sev === 'warn' || sev === 'warning') return '▲';
                return '■';
              })();
              const content = (
                <>
                  <span className={severityColors[sev] || 'text-gray-500'} title={sev}>
                    {severitySymbol}
                  </span>
                  <span className="flex-1">
                    {issue.name && <span className="font-medium mr-1">{issue.name}</span>}
                    {issue.message}
                    {issue.suggestion && (
                      <div className="text-gray-400 mt-0.5 text-[10px]">
                        💡 {issue.suggestion}
                      </div>
                    )}
                    {issue.selection_hint?.triangle_indices?.length ? (
                      <div className="mt-0.5 text-[10px] text-blue-500" title="Selection highlight available">Highlight ready</div>
                    ) : null}
                  </span>
                  {issue.source && (
                    <span className="text-[9px] uppercase tracking-wide text-gray-400">{issue.source}</span>
                  )}
                </>
              );
              return (
                <li key={issue.id ?? issue.rule_id ?? issue.name ?? 'issue'}>
                  {interactive ? (
                    <button
                      type="button"
                      onClick={() => maybeHandleSelect(issue.id)}
                      className={`${baseCls} ${stateCls}`}
                    >
                      {content}
                    </button>
                  ) : (
                    <div className={`${baseCls} ${stateCls}`}>
                      {content}
                    </div>
                  )}
                </li>
              );
            })}
            {normalizedIssues.length > 50 && <li className="text-gray-400">+{normalizedIssues.length-50} more…</li>}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-gray-500 mb-1">Recommendations ({recommendations.length})</div>
          <ul className="space-y-1 max-h-32 overflow-auto pr-1 text-[11px]">
            {recommendations.slice(0,20).map((rec: DfmRecommendation) => {
              const key = `${rec.title ?? rec.description ?? rec.type}-${rec.priority}-${rec.impact?.cost_savings_percent ?? ''}`;
              return (
              <li key={key} className="border-l-2 border-blue-200 pl-2">
                <div className="flex items-start gap-2">
                  <span className={`text-xs ${priorityColors[rec.priority]} font-medium`}>
                    {rec.priority.toUpperCase()}
                  </span>
                  <div className="flex-1">
                    <div className="font-medium">{rec.title}</div>
                    <div className="text-gray-600">{rec.description}</div>
                    {rec.impact && (
                      <div className="text-[10px] text-gray-500 mt-1">
                        {rec.impact.cost_savings_percent && `💰 Save ${rec.impact.cost_savings_percent}%`}
                        {rec.impact.lead_time_reduction_days && ` ⏱️ ${rec.impact.lead_time_reduction_days} days faster`}
                        {rec.impact.quality_improvement && ` ✨ ${rec.impact.quality_improvement}`}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );})}
            {recommendations.length > 20 && <li className="text-gray-400">+{recommendations.length-20} more…</li>}
          </ul>
        </div>
      )}

      {/* Process Recommendations */}
      {processRecommendations.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-medium text-gray-500 mb-1">Process Recommendations</div>
          <div className="space-y-1 text-[11px]">
            {processRecommendations.slice(0,3).map((proc: any) => {
              const key = `${proc?.process ?? 'proc'}-${proc?.estimated_cost ?? ''}-${proc?.estimated_lead_time_days ?? ''}`;
              let suitabilityColor = 'text-red-600';
              if (proc?.suitability_score >= 80) suitabilityColor = 'text-green-600';
              else if (proc?.suitability_score >= 60) suitabilityColor = 'text-amber-600';
              return (
              <div key={key} className="flex justify-between items-center p-1 bg-gray-50 dark:bg-gray-800 rounded">
                <div>
                  <div className="font-medium">{proc.process}</div>
                  <div className="text-gray-500 text-[10px]">
                    ${proc.estimated_cost} • {proc.estimated_lead_time_days} days
                  </div>
                </div>
                <div className={`text-xs font-semibold ${suitabilityColor}`}>
                  {proc.suitability_score}/100
                </div>
              </div>
            );})}
          </div>
        </div>
      )}

      {normalizedIssues.length === 0 && recommendations.length === 0 && !manufacturabilityScore && (
        <div className="text-[10px] text-gray-500">No DFM analysis available.</div>
      )}
    </div>
  );
};

export default DfmPanel;
