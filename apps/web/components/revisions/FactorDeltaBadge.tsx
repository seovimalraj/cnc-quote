/**
 * Step 16: Factor Delta Badge
 * Visual badge for factor-level price changes
 */

'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface FactorDeltaBadgeProps {
  factor: string;
  delta: number;
  pct: number;
  from?: number;
  to?: number;
  showDetail?: boolean;
}

export function FactorDeltaBadge({
  factor,
  delta,
  pct,
  from,
  to,
  showDetail = false,
}: FactorDeltaBadgeProps) {
  const isIncrease = delta > 0;
  const isSignificant = Math.abs(pct) > 0.20; // 20%
  const isNeutral = Math.abs(delta) < 0.01;

  // Color coding
  const colorClasses = isNeutral
    ? 'bg-gray-100 text-gray-700'
    : isIncrease
      ? isSignificant
        ? 'bg-red-100 text-red-800'
        : 'bg-red-50 text-red-700'
      : isSignificant
        ? 'bg-green-100 text-green-800'
        : 'bg-green-50 text-green-700';

  const Icon = isNeutral ? Minus : isIncrease ? TrendingUp : TrendingDown;

  // Format factor name
  const factorLabel = factor
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div className={`inline-flex flex-col gap-1 rounded-lg px-3 py-2 ${colorClasses}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="font-medium text-sm">{factorLabel}</span>
      </div>

      <div className="flex items-baseline gap-2 text-xs">
        <span className="font-semibold">
          {isIncrease ? '+' : ''}${Math.abs(delta).toFixed(2)}
        </span>
        <span className="opacity-75">
          ({isIncrease ? '+' : ''}
          {(pct * 100).toFixed(1)}%)
        </span>
      </div>

      {showDetail && from !== undefined && to !== undefined && (
        <div className="text-xs opacity-75 mt-0.5">
          ${from.toFixed(2)} → ${to.toFixed(2)}
        </div>
      )}
    </div>
  );
}
