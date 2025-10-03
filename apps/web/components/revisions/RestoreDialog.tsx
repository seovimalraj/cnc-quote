/**
 * Step 16: Restore Dialog Component
 * Policy-gated dialog for restoring previous revisions
 */

'use client';

import { useState } from 'react';
import { X, AlertTriangle, RotateCcw } from 'lucide-react';
import type { QuoteRevision } from '@/lib/api/revisions';

interface RestoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore: (note?: string) => Promise<void>;
  revision: QuoteRevision | null;
  currentVersion: number;
  canRestore: boolean;
  requireNote?: boolean;
}

export function RestoreDialog({
  isOpen,
  onClose,
  onRestore,
  revision,
  currentVersion,
  canRestore,
  requireNote = false,
}: RestoreDialogProps) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (requireNote && !note.trim()) {
      setError('Note is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onRestore(note.trim() || undefined);
      onClose();
      setNote('');
    } catch (err: any) {
      setError(err.message || 'Failed to restore revision');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !revision) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">Restore Revision</h2>
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
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-900">
                <p className="font-medium mb-1">This will overwrite current working state</p>
                <p>
                  Restoring version {revision.version} will create a new revision
                  (v{currentVersion + 1}) and update the quote to match the selected
                  snapshot. The current state will be preserved in revision history.
                </p>
              </div>
            </div>

            {/* Revision Info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Restoring Version:</span>
                <span className="font-medium">v{revision.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {new Date(revision.created_at).toLocaleString()}
                </span>
              </div>
              {revision.actor && (
                <div className="flex justify-between">
                  <span className="text-gray-600">By:</span>
                  <span className="font-medium">{revision.actor.name}</span>
                </div>
              )}
              {revision.note && (
                <div className="flex flex-col gap-1">
                  <span className="text-gray-600">Original Note:</span>
                  <p className="text-gray-900 bg-gray-50 p-2 rounded border">
                    {revision.note}
                  </p>
                </div>
              )}
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restore Note{requireNote && <span className="text-red-600"> *</span>}
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Why are you restoring this revision?"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                rows={3}
                disabled={isSubmitting}
              />
              {requireNote && (
                <p className="text-xs text-gray-500 mt-1">
                  A note is required for restore operations
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Permission Warning */}
            {!canRestore && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600">
                  You don't have permission to restore revisions. Please contact an
                  administrator.
                </p>
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
              disabled={isSubmitting || !canRestore}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Restoring...' : 'Restore Revision'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
