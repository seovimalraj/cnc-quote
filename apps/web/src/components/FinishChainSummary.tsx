/**
 * Finish Chain Summary Component
 * Compact display of finish chain cost and lead time
 */

import React from 'react';
import { ChainStep } from '../types/finish-chain';

interface FinishChainSummaryProps {
  steps: ChainStep[];
  totalCostCents: number;
  addedLeadDays: number;
  loading?: boolean;
}

export const FinishChainSummary: React.FC<FinishChainSummaryProps> = ({
  steps,
  totalCostCents,
  addedLeadDays,
  loading,
}) => {
  if (loading) {
    return (
      <div className="p-4 border rounded bg-gray-50">
        <div className="animate-pulse">Loading finish details...</div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="p-4 border rounded bg-gray-50">
        <p className="text-sm text-gray-600">No finish operations applied</p>
      </div>
    );
  }

  return (
    <div className="p-4 border rounded bg-white">
      <h4 className="font-semibold mb-3">Finish Operations</h4>
      
      {/* Steps List */}
      <div className="space-y-2 mb-4">
        {steps.map((step, idx) => (
          <div key={idx} className="flex justify-between items-start text-sm">
            <div className="flex items-start gap-2">
              <span className="text-xs font-mono bg-gray-200 px-1.5 py-0.5 rounded">
                {step.sequence}
              </span>
              <div>
                <div className="font-medium">{step.operation_name}</div>
                <div className="text-xs text-gray-500">{step.operation_code}</div>
              </div>
            </div>
            {step.cost_cents !== undefined && (
              <div className="text-right">
                <div className="font-medium text-green-700">
                  ${(step.cost_cents / 100).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">+{step.lead_days}d</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Total Summary */}
      <div className="pt-3 border-t space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Finish Cost:</span>
          <span className="font-semibold text-green-700">
            ${(totalCostCents / 100).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Added Lead Time:</span>
          <span className="font-semibold text-blue-700">+{addedLeadDays} days</span>
        </div>
      </div>
    </div>
  );
};
