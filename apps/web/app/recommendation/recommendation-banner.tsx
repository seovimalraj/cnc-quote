/**
 * RecommendationBanner Component (Step 10)
 * Shows success banner after applying a recommendation
 */

'use client';

import React, { useState, useEffect } from 'react';

interface RecommendationBannerProps {
  process: string;
  confidence: number;
  onUndo?: () => void;
  autoDismissMs?: number;
}

const processDisplayNames: Record<string, string> = {
  cnc_milling: 'CNC Milling',
  turning: 'CNC Turning',
  sheet_metal: 'Sheet Metal',
  injection_molding: 'Injection Molding',
  additive: 'Additive Manufacturing',
};

export function RecommendationBanner({
  process,
  confidence,
  onUndo,
  autoDismissMs = 8000,
}: RecommendationBannerProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoDismissMs > 0) {
      const timer = setTimeout(() => setVisible(false), autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [autoDismissMs]);

  if (!visible) return null;

  const displayName = processDisplayNames[process] || process;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md animate-slide-in">
      <div className="bg-green-50 border border-green-300 rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <svg
                className="w-5 h-5 text-green-600"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <h4 className="font-semibold text-green-900">Process Applied</h4>
            </div>
            <p className="text-sm text-green-800">
              Applied <strong>{displayName}</strong> ({(confidence * 100).toFixed(0)}% confidence)
            </p>
            {onUndo && (
              <button
                onClick={onUndo}
                className="mt-2 text-sm text-green-700 underline hover:text-green-900"
              >
                Undo
              </button>
            )}
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-green-600 hover:text-green-800"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
