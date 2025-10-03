/**
 * RecommendationCard Component (Step 10)
 * Displays process recommendations with confidence bars and apply button
 */

'use client';

import React, { useState } from 'react';
import { ProcessRecommendation } from './useRecommendation';

interface RecommendationCardProps {
  recommendations: ProcessRecommendation[];
  currentProcess?: string;
  onApply: (process: string, confidence: number) => void;
  disabled?: boolean;
}

const processDisplayNames: Record<string, string> = {
  cnc_milling: 'CNC Milling',
  turning: 'CNC Turning',
  sheet_metal: 'Sheet Metal',
  injection_molding: 'Injection Molding',
  additive: 'Additive Manufacturing',
};

export function RecommendationCard({
  recommendations,
  currentProcess,
  onApply,
  disabled = false,
}: RecommendationCardProps) {
  const [applying, setApplying] = useState<string | null>(null);

  const handleApply = async (rec: ProcessRecommendation) => {
    setApplying(rec.process);
    try {
      await onApply(rec.process, rec.confidence);
    } finally {
      setApplying(null);
    }
  };

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <p className="text-sm text-gray-500">No process recommendations available</p>
      </div>
    );
  }

  const topThree = recommendations.slice(0, 3);

  return (
    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Recommended Manufacturing Processes</h3>
        <span className="text-xs text-gray-500">AI-Powered</span>
      </div>

      <div className="space-y-3">
        {topThree.map((rec, idx) => {
          const isTop = idx === 0;
          const isCurrent = rec.process === currentProcess;
          const displayName = processDisplayNames[rec.process] || rec.process;

          return (
            <div
              key={rec.process}
              className={`border rounded-lg p-3 ${
                isTop ? 'border-blue-400 bg-white' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {isTop && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded">
                      TOP PICK
                    </span>
                  )}
                  <span className="font-medium text-gray-900">{displayName}</span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                      Current
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {(rec.confidence * 100).toFixed(0)}%
                </span>
              </div>

              {/* Confidence bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full ${
                    rec.confidence >= 0.7
                      ? 'bg-green-500'
                      : rec.confidence >= 0.5
                      ? 'bg-blue-500'
                      : 'bg-yellow-500'
                  }`}
                  style={{ width: `${rec.confidence * 100}%` }}
                />
              </div>

              {/* Reasons */}
              {rec.reasons.length > 0 && (
                <ul className="text-xs text-gray-600 space-y-1 mb-2">
                  {rec.reasons.slice(0, 3).map((reason, ridx) => (
                    <li key={ridx} className="flex items-start">
                      <span className="mr-1.5">•</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Blocking constraints */}
              {rec.blocking_constraints.length > 0 && (
                <div className="text-xs text-amber-700 bg-amber-50 rounded p-2 mb-2">
                  <strong>Constraints:</strong>
                  <ul className="mt-1 space-y-0.5">
                    {rec.blocking_constraints.map((constraint, cidx) => (
                      <li key={cidx}>• {constraint}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Apply button */}
              {!isCurrent && (
                <button
                  onClick={() => handleApply(rec)}
                  disabled={disabled || applying === rec.process}
                  className={`w-full mt-2 px-4 py-2 text-sm font-medium rounded ${
                    disabled || applying === rec.process
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isTop
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  {applying === rec.process ? 'Applying...' : 'Apply This Process'}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
