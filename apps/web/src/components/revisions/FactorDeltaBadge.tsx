/**
 * Step 16: Factor Delta Badge Component
 * Shows individual factor changes with visual indicators
 */

'use client';

interface FactorDeltaBadgeProps {
  factor: string;
  delta: number;
  pct: number;
  size?: 'sm' | 'md';
}

export function FactorDeltaBadge({ factor, delta, pct, size = 'sm' }: FactorDeltaBadgeProps) {
  const isIncrease = delta > 0;
  const absChange = Math.abs(delta);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  // Format factor name (snake_case to Title Case)
  const formatFactor = (name: string) => {
    return name
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div
      className={`inline-flex items-center justify-between gap-2 rounded-md border ${sizeClasses[size]} ${
        isIncrease
          ? 'bg-red-50 border-red-200 text-red-700'
          : 'bg-green-50 border-green-200 text-green-700'
      }`}
    >
      <span className="font-medium">{formatFactor(factor)}</span>
      <div className="flex items-center gap-1">
        <span className="font-semibold">
          {isIncrease ? '+' : '-'}${absChange.toFixed(2)}
        </span>
        <span className="text-xs opacity-75">
          ({isIncrease ? '+' : ''}{(pct * 100).toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}
