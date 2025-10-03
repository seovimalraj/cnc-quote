/**
 * Step 16: Revision Chip Component
 * Displays delta amount with color-coded badge
 */

'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface RevisionChipProps {
  deltaAmount: number;
  deltaPct: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RevisionChip({ deltaAmount, deltaPct, size = 'md' }: RevisionChipProps) {
  const isIncrease = deltaAmount > 0;
  const isZero = Math.abs(deltaAmount) < 0.01;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const iconSize = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  if (isZero) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full bg-gray-100 text-gray-700 font-medium ${sizeClasses[size]}`}
      >
        <Minus size={iconSize[size]} />
        <span>No change</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses[size]} ${
        isIncrease
          ? 'bg-red-50 text-red-700'
          : 'bg-green-50 text-green-700'
      }`}
    >
      {isIncrease ? (
        <TrendingUp size={iconSize[size]} />
      ) : (
        <TrendingDown size={iconSize[size]} />
      )}
      <span>
        {isIncrease ? '+' : ''}${Math.abs(deltaAmount).toFixed(2)}
      </span>
      <span className="text-xs opacity-75">
        ({isIncrease ? '+' : ''}{(deltaPct * 100).toFixed(1)}%)
      </span>
    </span>
  );
}
