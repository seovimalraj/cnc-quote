/**
 * Step 15: Extend Expiration Modal
 * Modal for extending quote expiration by preset days
 */

'use client';

import { useState } from 'react';
import { X, Calendar } from 'lucide-react';

interface ExtendExpirationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExtend: (days: number) => Promise<void>;
  currentExpiresAt: Date | null;
}

export function ExtendExpirationModal({
  isOpen,
  onClose,
  onExtend,
  currentExpiresAt,
}: ExtendExpirationModalProps) {
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const presetOptions = [
    { days: 7, label: '7 days' },
    { days: 14, label: '14 days' },
    { days: 30, label: '30 days' },
  ];

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      await onExtend(selectedDays);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to extend expiration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateNewDate = () => {
    const baseDate = currentExpiresAt || new Date();
    const newDate = new Date(baseDate.getTime() + selectedDays * 24 * 60 * 60 * 1000);
    return newDate;
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

      {/* Modal */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Extend Expiration</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {currentExpiresAt && (
              <div className="text-sm text-gray-600">
                <p>Current expiration: <strong>{new Date(currentExpiresAt).toLocaleDateString()}</strong></p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Extend by:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {presetOptions.map((option) => (
                  <button
                    key={option.days}
                    type="button"
                    onClick={() => setSelectedDays(option.days)}
                    className={`px-4 py-3 rounded-lg border-2 text-center transition-colors ${
                      selectedDays === option.days
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <div className="font-semibold">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>New expiration date:</strong>{' '}
                {calculateNewDate().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Extending...' : 'Extend Expiration'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
