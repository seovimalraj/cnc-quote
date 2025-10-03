/**
 * Step 16: Revision Chip Component
 * Visual chip for timeline events with color coding
 */

'use client';

import { Clock, Zap, DollarSign, RotateCcw, FileText } from 'lucide-react';
import type { EventType } from '@/lib/api/revisions';

interface RevisionChipProps {
  eventType: EventType;
  deltaAmount: number;
  deltaPct: number;
  size?: 'sm' | 'md' | 'lg';
}

export function RevisionChip({
  eventType,
  deltaAmount,
  deltaPct,
  size = 'md',
}: RevisionChipProps) {
  const isIncrease = deltaAmount > 0;
  const isSignificant = Math.abs(deltaPct) > 0.05; // 5%

  // Event type styling
  const eventConfig: Record<EventType, {
    icon: typeof FileText;
    label: string;
    color: string;
  }> = {
    user_update: {
      icon: FileText,
      label: 'Manual Edit',
      color: 'blue',
    },
    system_reprice: {
      icon: Zap,
      label: 'Auto-Reprice',
      color: 'purple',
    },
    tax_update: {
      icon: DollarSign,
      label: 'Tax Update',
      color: 'amber',
    },
    restore: {
      icon: RotateCcw,
      label: 'Restored',
      color: 'green',
    },
    initial: {
      icon: Clock,
      label: 'Initial',
      color: 'gray',
    },
  };

  const config = eventConfig[eventType];
  const Icon = config.icon;

  // Size classes
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  // Delta color
  const deltaColor = isIncrease
    ? isSignificant
      ? 'text-red-700'
      : 'text-red-600'
    : isSignificant
      ? 'text-green-700'
      : 'text-green-600';

  const deltaSign = isIncrease ? '+' : '';

  return (
    <div className="inline-flex items-center gap-2">
      {/* Event Type Badge */}
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]} bg-${config.color}-100 text-${config.color}-700`}
      >
        <Icon className={iconSizes[size]} />
        {config.label}
      </span>

      {/* Delta Badge */}
      {Math.abs(deltaAmount) > 0.01 && (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-semibold ${sizeClasses[size]} ${deltaColor} bg-opacity-10`}
        >
          <span>
            {deltaSign}${Math.abs(deltaAmount).toFixed(2)}
          </span>
          <span className="text-xs opacity-75">
            ({deltaSign}
            {(deltaPct * 100).toFixed(1)}%)
          </span>
        </span>
      )}
    </div>
  );
}
