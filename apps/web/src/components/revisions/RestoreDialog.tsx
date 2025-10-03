/**
 * Step 16: Restore Revision Dialog
 * Policy-gated restore with warnings and note capture
 */

'use client';

import { useState } from 'react';
import { X, AlertTriangle, RefreshCw } from 'lucide-react';

interface RestoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (note?: string) => Promise<void>;
  revisionVersion: number;
  quoteStatus: string;
  canRestore: boolean;
}

export function RestoreDialog({
  isOpen,
  onClose,
  onRestore,
  revisionVersion,
  quoteStatus,
  canRestore,
}: RestoreDialogProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!canRestore) return;

    setError(null);
    setIsSubmitting(true);

    try {
      await onRestore(note || undefined);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to restore revision');
    } finally {
      setIsSubmitting(false);
    }
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

      {/* Dialog */}
      <div
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restore-dialog-title"
      >
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              <h2 id="restore-dialog-title" className="text-lg font-semibold">
                Restore Revision
              </h2>
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
            {!canRestore && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-900">
                  <p className="font-medium mb-1">Cannot Restore</p>
                  <p>
                    Restoring is only allowed for quotes in <strong>draft</strong> or{' '}
                    <strong>pending</strong> status. Current status: <strong>{quoteStatus}</strong>
                  </p>
                </div>
              </div>
            )}

            {canRestore && (
              <>
                {/* Warning */}
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-900">
                    <p className="font-medium mb-1">Warning</p>
                    <p>
                      This will replace the current quote state with revision{' '}
                      <strong>v{revisionVersion}</strong>. A new revision will be created to
                      track this restore action.
                    </p>
                  </div>
                </div>

                {/* Note Field */}
                <div>
                  <label
                    htmlFor="restore-note"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Note (optional)
                  </label>
                  <textarea
                    id="restore-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Why are you restoring this revision?"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Add context for future reference and audit trail
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
              </>
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
            {canRestore && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Restoring...</span>
                  </>
                ) : (
                  <span>Restore Revision</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
