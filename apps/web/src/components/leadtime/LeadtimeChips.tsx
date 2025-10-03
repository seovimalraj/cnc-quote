/**
 * Step 12: Lead Time Chips Component
 * Interactive UI for selecting lead time class with dynamic pricing
 */

'use client';

import React, { useState, useEffect } from 'react';
import type { LeadtimeOption, LeadClass, LeadtimeResponse } from '@cnc-quote/shared';

export interface LeadtimeChipsProps {
  orgId: string;
  process: string;
  machineGroup: string;
  basePrice: number;
  estimatedMinutes: number;
  selectedClass?: LeadClass;
  onSelect?: (option: LeadtimeOption | null) => void;
  className?: string;
}

export function LeadtimeChips({
  orgId,
  process,
  machineGroup,
  basePrice,
  estimatedMinutes,
  selectedClass,
  onSelect,
  className = '',
}: LeadtimeChipsProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<LeadtimeResponse | null>(null);
  const [selected, setSelected] = useState<LeadClass | undefined>(selectedClass);

  // Fetch lead time options
  useEffect(() => {
    const fetchOptions = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          orgId,
          process,
          machineGroup,
          basePrice: basePrice.toString(),
          estimatedMinutes: estimatedMinutes.toString(),
        });

        const res = await fetch(`/api/leadtime/options?${params}`);

        if (!res.ok) {
          throw new Error(`Failed to fetch lead time options: ${res.statusText}`);
        }

        const data: LeadtimeResponse = await res.json();
        setResponse(data);
      } catch (err: any) {
        console.error('Error fetching lead time options:', err);
        setError(err.message || 'Failed to load lead time options');
      } finally {
        setLoading(false);
      }
    };

    if (orgId && process && machineGroup && basePrice > 0) {
      fetchOptions();
    }
  }, [orgId, process, machineGroup, basePrice, estimatedMinutes]);

  // Handle chip selection
  const handleSelect = (option: LeadtimeOption) => {
    const newSelected = selected === option.class ? undefined : option.class;
    setSelected(newSelected);

    if (onSelect) {
      onSelect(newSelected ? option : null);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className={`flex gap-2 ${className}`}>
        {['econ', 'standard', 'express'].map((cls) => (
          <div
            key={cls}
            className="h-20 w-32 animate-pulse rounded-lg bg-gray-200"
          />
        ))}
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className={`rounded-lg border border-red-300 bg-red-50 p-4 ${className}`}>
        <p className="text-sm text-red-700">
          Unable to load lead time options: {error}
        </p>
      </div>
    );
  }

  // No options available
  if (!response || response.options.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-300 bg-gray-50 p-4 ${className}`}>
        <p className="text-sm text-gray-600">No lead time options available</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Select Lead Time</h3>
        <span className="text-xs text-gray-500">
          Base price: ₹{basePrice.toLocaleString()}
        </span>
      </div>

      <div className="flex gap-3">
        {response.options.map((option) => (
          <LeadtimeChip
            key={option.class}
            option={option}
            selected={selected === option.class}
            onSelect={() => handleSelect(option)}
          />
        ))}
      </div>

      {/* Selected option details */}
      {selected && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          {(() => {
            const option = response.options.find((o) => o.class === selected);
            if (!option) return null;

            return (
              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">
                    {formatClassName(option.class)} - {option.days} business days
                  </span>
                  <span className="font-semibold text-blue-900">
                    {formatPriceDelta(option.priceDelta)}
                  </span>
                </div>
                <p className="text-blue-700">
                  Expected ship date: <strong>{formatDate(option.shipDate)}</strong>
                </p>
                {option.reasons.length > 0 && (
                  <ul className="mt-2 space-y-1 text-xs text-blue-600">
                    {option.reasons.map((reason, idx) => (
                      <li key={idx}>• {reason}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

interface LeadtimeChipProps {
  option: LeadtimeOption;
  selected: boolean;
  onSelect: () => void;
}

function LeadtimeChip({ option, selected, onSelect }: LeadtimeChipProps) {
  const isDiscount = option.priceDelta < 0;
  const isSurge = option.surgeApplied && option.priceDelta > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        relative flex min-w-[140px] flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all
        ${
          selected
            ? 'border-blue-500 bg-blue-50 shadow-md'
            : 'border-gray-300 bg-white hover:border-gray-400 hover:shadow-sm'
        }
      `}
    >
      {/* Class label */}
      <div className="text-center">
        <div className="text-sm font-semibold text-gray-900">
          {formatClassName(option.class)}
        </div>
        <div className="text-xs text-gray-600">{option.days} days</div>
      </div>

      {/* Price delta */}
      <div
        className={`
          text-lg font-bold
          ${isDiscount ? 'text-green-600' : isSurge ? 'text-orange-600' : 'text-gray-900'}
        `}
      >
        {formatPriceDelta(option.priceDelta)}
      </div>

      {/* Ship date */}
      <div className="text-xs text-gray-500">{formatDate(option.shipDate)}</div>

      {/* Surge indicator */}
      {isSurge && (
        <div className="absolute -right-1 -top-1 rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-semibold text-white">
          SURGE
        </div>
      )}

      {/* Discount indicator */}
      {isDiscount && (
        <div className="absolute -right-1 -top-1 rounded-full bg-green-500 px-2 py-0.5 text-[10px] font-semibold text-white">
          SAVE
        </div>
      )}

      {/* Utilization tooltip */}
      <div className="group relative">
        <div className="text-[10px] text-gray-400">
          Capacity: {(option.utilizationWindow * 100).toFixed(0)}%
        </div>

        {/* Tooltip */}
        {option.reasons.length > 0 && (
          <div className="absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-lg group-hover:block">
            <ul className="space-y-1 text-xs text-gray-700">
              {option.reasons.map((reason, idx) => (
                <li key={idx}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </button>
  );
}

// Utility functions
function formatClassName(cls: LeadClass): string {
  switch (cls) {
    case 'econ':
      return 'Economy';
    case 'standard':
      return 'Standard';
    case 'express':
      return 'Express';
    default:
      return cls;
  }
}

function formatPriceDelta(delta: number): string {
  if (delta === 0) {
    return '₹0';
  }

  const sign = delta > 0 ? '+' : '';
  return `${sign}₹${Math.abs(delta).toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
