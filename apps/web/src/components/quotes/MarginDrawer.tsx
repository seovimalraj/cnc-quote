/**
 * Step 14: MarginDrawer Component
 * Drawer UI for viewing quote margin breakdown
 */

'use client';

import { X, Download } from 'lucide-react';
import { useMargins, useExportMarginsCsv } from '@/lib/api/useQuotes';
import type { CostBreakdown } from '@/lib/api/quotes';

interface MarginDrawerProps {
  quoteId: string;
  isOpen: boolean;
  onClose: () => void;
  canView?: boolean; // RBAC: quotes:view_margin
}

export function MarginDrawer({
  quoteId,
  isOpen,
  onClose,
  canView = false,
}: MarginDrawerProps) {
  const { data: margins, isLoading, error } = useMargins(quoteId, {
    enabled: isOpen && canView,
  });
  const exportCsv = useExportMarginsCsv();

  const handleExport = () => {
    exportCsv.mutate({});
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-4xl bg-white shadow-xl z-50 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Margin Breakdown</h2>
            <div className="flex items-center gap-3">
              {canView && margins && (
                <button
                  onClick={handleExport}
                  disabled={exportCsv.isPending}
                  className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {!canView ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                You don't have permission to view margin data
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">
                {error.message.includes('NOT_FINALIZED')
                  ? 'Margins not yet finalized for this quote'
                  : 'Failed to load margin data'}
              </p>
            </div>
          ) : margins ? (
            <div className="space-y-6">
              {/* Quote Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Quote Summary
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Total Price</p>
                    <p className="text-lg font-semibold">
                      ${margins.quote.total_price.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Gross Margin</p>
                    <p className="text-lg font-semibold text-green-600">
                      ${margins.quote.gross_margin_amount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Margin %</p>
                    <p className="text-lg font-semibold text-green-600">
                      {(margins.quote.gross_margin_pct * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Line Item Breakdown
                </h3>
                <div className="space-y-4">
                  {margins.lines.map((line) => (
                    <LineBreakdownCard key={line.line_id} line={line} />
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

// ============================================
// Sub-component: Line Breakdown Card
// ============================================

function LineBreakdownCard({
  line,
}: {
  line: {
    line_id: string;
    process: string;
    material: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    line_cost_breakdown: CostBreakdown;
    margin_amount: number;
    margin_pct: number;
  };
}) {
  const breakdown = line.line_cost_breakdown;
  const cogs =
    (breakdown.setup_time_cost || 0) +
    (breakdown.machine_time_cost || 0) +
    (breakdown.material_cost || 0) +
    (breakdown.finish_cost || 0) +
    (breakdown.risk_markup || 0) +
    (breakdown.tolerance_multiplier_cost || 0) +
    (breakdown.overhead_cost || 0);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      {/* Line Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium">
            {line.process} - {line.material}
          </p>
          <p className="text-sm text-gray-500">
            Qty: {line.quantity} @ ${line.unit_price.toFixed(2)} each
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">${line.total_price.toFixed(2)}</p>
          <p className="text-sm text-green-600">
            +${line.margin_amount.toFixed(2)} (
            {(line.margin_pct * 100).toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Cost Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-700">
                Cost Component
              </th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">
                Amount
              </th>
              <th className="text-right px-3 py-2 font-medium text-gray-700">
                % of COGS
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {[
              { label: 'Setup Time', value: breakdown.setup_time_cost },
              { label: 'Machine Time', value: breakdown.machine_time_cost },
              { label: 'Material', value: breakdown.material_cost },
              { label: 'Finishing', value: breakdown.finish_cost },
              { label: 'Risk Markup', value: breakdown.risk_markup },
              { label: 'Tolerance Premium', value: breakdown.tolerance_multiplier_cost },
              { label: 'Overhead', value: breakdown.overhead_cost },
            ].map((item) => (
              <tr key={item.label}>
                <td className="px-3 py-2 text-gray-700">{item.label}</td>
                <td className="px-3 py-2 text-right text-gray-900">
                  ${(item.value || 0).toFixed(2)}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">
                  {cogs > 0 ? (((item.value || 0) / cogs) * 100).toFixed(1) : 0}%
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-medium">
              <td className="px-3 py-2">Total COGS</td>
              <td className="px-3 py-2 text-right">${cogs.toFixed(2)}</td>
              <td className="px-3 py-2 text-right">100.0%</td>
            </tr>
            <tr className="bg-green-50 font-medium text-green-700">
              <td className="px-3 py-2">Margin</td>
              <td className="px-3 py-2 text-right">
                ${line.margin_amount.toFixed(2)}
              </td>
              <td className="px-3 py-2 text-right">
                {(line.margin_pct * 100).toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
