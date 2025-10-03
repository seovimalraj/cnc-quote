/**
 * Step 15: Pricing Diff Drawer
 * Shows factor-level pricing changes with visual diff
 */

'use client';

import { X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface PricingDiffLineItem {
  factor: string;
  old: number;
  new: number;
  delta: number;
  delta_pct: number;
  reason: string | null;
}

interface PricingDiff {
  total_delta: number;
  pct_delta: number;
  line_items: PricingDiffLineItem[];
  lead_time_delta_days: number | null;
  tax_delta: number | null;
  warnings: string[];
  old_pricing_version: string;
  new_pricing_version: string;
}

interface DiffDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  diff: PricingDiff | null;
  onApply?: () => void;
  canApply?: boolean;
}

export function DiffDrawer({
  isOpen,
  onClose,
  diff,
  onApply,
  canApply = false,
}: DiffDrawerProps) {
  if (!isOpen || !diff) return null;

  const isIncrease = diff.total_delta > 0;
  const isSignificant = Math.abs(diff.pct_delta) > 5;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Pricing Diff</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Version Info */}
          {diff.old_pricing_version !== diff.new_pricing_version && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                Pricing version: <strong>{diff.old_pricing_version}</strong> → <strong>{diff.new_pricing_version}</strong>
              </p>
            </div>
          )}

          {/* Warnings */}
          {diff.warnings.length > 0 && (
            <div className="mb-4 space-y-2">
              {diff.warnings.map((warning, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                >
                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-900">{warning}</p>
                </div>
              ))}
            </div>
          )}

          {/* Total Change Summary */}
          <div className={`p-4 rounded-lg mb-6 ${
            isIncrease ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Total Price Change</p>
                <div className="flex items-center gap-2 mt-1">
                  {isIncrease ? (
                    <TrendingUp className="h-5 w-5 text-red-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-green-600" />
                  )}
                  <span className={`text-2xl font-bold ${
                    isIncrease ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {isIncrease ? '+' : ''}${diff.total_delta.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Percentage</p>
                <p className={`text-xl font-semibold ${
                  isIncrease ? 'text-red-600' : 'text-green-600'
                }`}>
                  {isIncrease ? '+' : ''}{diff.pct_delta.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>

          {/* Factor Changes Table */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Cost Factor Changes</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-gray-700">Factor</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-700">Old</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-700">New</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-700">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {diff.line_items.map((item, idx) => {
                    const isItemIncrease = item.delta > 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{item.factor}</p>
                            {item.reason && (
                              <p className="text-xs text-gray-500 mt-1">{item.reason}</p>
                            )}
                          </div>
                        </td>
                        <td className="text-right px-4 py-3 text-gray-600">
                          ${item.old.toFixed(2)}
                        </td>
                        <td className="text-right px-4 py-3 text-gray-900 font-medium">
                          ${item.new.toFixed(2)}
                        </td>
                        <td className="text-right px-4 py-3">
                          <div className="flex flex-col items-end">
                            <span className={`font-semibold ${
                              isItemIncrease ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {isItemIncrease ? '+' : ''}${item.delta.toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({isItemIncrease ? '+' : ''}{item.delta_pct.toFixed(1)}%)
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Lead Time Delta */}
          {diff.lead_time_delta_days !== null && diff.lead_time_delta_days !== 0 && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm">
                <strong>Lead Time Change:</strong>{' '}
                {diff.lead_time_delta_days > 0 ? '+' : ''}
                {diff.lead_time_delta_days} days
              </p>
            </div>
          )}

          {/* Tax Delta */}
          {diff.tax_delta !== null && diff.tax_delta !== 0 && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm">
                <strong>Tax Change:</strong>{' '}
                {diff.tax_delta > 0 ? '+' : ''}${diff.tax_delta.toFixed(2)}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
            {canApply && onApply && (
              <button
                onClick={onApply}
                className={`flex-1 px-4 py-2 rounded-md text-white font-medium ${
                  isSignificant
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Apply Repricing
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
