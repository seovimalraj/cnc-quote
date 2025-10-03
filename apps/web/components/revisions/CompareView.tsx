/**
 * Step 16: Revision Compare View
 * Side-by-side comparison of two revisions with field changes and factor deltas
 */

'use client';

import { useState } from 'react';
import { X, Download, Eye, EyeOff } from 'lucide-react';
import { FactorDeltaBadge } from './FactorDeltaBadge';
import type { CompareRevisionsResponse, FieldChange } from '@/lib/api/revisions';

interface CompareViewProps {
  isOpen: boolean;
  onClose: () => void;
  comparison: CompareRevisionsResponse | null;
}

export function CompareView({ isOpen, onClose, comparison }: CompareViewProps) {
  const [showOnlyChanged, setShowOnlyChanged] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'fields' | 'factors' | 'lines'>(
    'summary'
  );

  if (!isOpen || !comparison) return null;

  const { a, b, diff_json } = comparison;

  const handleExportCsv = () => {
    const csv = generateCsv(diff_json);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revision-compare-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

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
            <div>
              <h2 className="text-lg font-semibold">Compare Revisions</h2>
              <p className="text-sm text-gray-600 mt-1">
                v{a.version} vs v{b.version}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={() => setShowOnlyChanged(!showOnlyChanged)}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {showOnlyChanged ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showOnlyChanged ? 'Show All' : 'Changed Only'}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200 mb-6">
            {[
              { id: 'summary', label: 'Summary' },
              { id: 'fields', label: `Fields (${diff_json.fields.length})` },
              { id: 'factors', label: `Factors (${diff_json.by_factor.length})` },
              { id: 'lines', label: `Lines (${diff_json.lines.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div>
            {activeTab === 'summary' && (
              <SummaryTab comparison={comparison} diff={diff_json} />
            )}
            {activeTab === 'fields' && (
              <FieldsTab fields={diff_json.fields} showOnlyChanged={showOnlyChanged} />
            )}
            {activeTab === 'factors' && (
              <FactorsTab factors={diff_json.by_factor} />
            )}
            {activeTab === 'lines' && (
              <LinesTab lines={diff_json.lines} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function SummaryTab({ comparison, diff }: any) {
  const { a, b } = comparison;
  const isIncrease = diff.summary.total_delta_amount > 0;

  return (
    <div className="space-y-6">
      {/* Overall Change */}
      <div
        className={`p-6 rounded-lg border-2 ${
          isIncrease ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Total Price Change</p>
            <p
              className={`text-3xl font-bold mt-2 ${
                isIncrease ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {isIncrease ? '+' : ''}${Math.abs(diff.summary.total_delta_amount).toFixed(2)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">Percentage</p>
            <p
              className={`text-2xl font-semibold mt-2 ${
                isIncrease ? 'text-red-600' : 'text-green-600'
              }`}
            >
              {isIncrease ? '+' : ''}
              {(diff.summary.total_delta_pct * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Fields Changed</p>
          <p className="text-2xl font-semibold mt-1">{diff.summary.fields_changed}</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Factors Affected</p>
          <p className="text-2xl font-semibold mt-1">{diff.by_factor.length}</p>
        </div>
        <div className="p-4 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600">Lines Changed</p>
          <p className="text-2xl font-semibold mt-1">{diff.summary.lines_changed}</p>
        </div>
      </div>

      {/* Revision Info */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">Version {a.version}</h3>
          <div className="text-sm space-y-1">
            <p className="text-gray-600">
              Created: {new Date(a.created_at).toLocaleString()}
            </p>
            {a.actor && <p className="text-gray-600">By: {a.actor.name}</p>}
            {a.note && (
              <p className="text-gray-900 bg-gray-50 p-2 rounded border mt-2">
                {a.note}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-900">Version {b.version}</h3>
          <div className="text-sm space-y-1">
            <p className="text-gray-600">
              Created: {new Date(b.created_at).toLocaleString()}
            </p>
            {b.actor && <p className="text-gray-600">By: {b.actor.name}</p>}
            {b.note && (
              <p className="text-gray-900 bg-gray-50 p-2 rounded border mt-2">
                {b.note}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldsTab({ fields, showOnlyChanged }: { fields: FieldChange[]; showOnlyChanged: boolean }) {
  const displayFields = showOnlyChanged ? fields : fields;

  if (displayFields.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No field changes detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {displayFields.map((field, idx) => (
        <div
          key={idx}
          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
        >
          <p className="text-sm font-mono text-gray-600 mb-2">{field.path}</p>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">From</p>
              <code className="text-sm bg-red-50 text-red-900 px-2 py-1 rounded">
                {JSON.stringify(field.from)}
              </code>
            </div>
            <div className="text-gray-400">→</div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">To</p>
              <code className="text-sm bg-green-50 text-green-900 px-2 py-1 rounded">
                {JSON.stringify(field.to)}
              </code>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FactorsTab({ factors }: any) {
  if (factors.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No factor changes detected</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {factors.map((factor: any, idx: number) => (
        <FactorDeltaBadge
          key={idx}
          factor={factor.factor}
          delta={factor.delta}
          pct={factor.pct}
          from={factor.from}
          to={factor.to}
          showDetail
        />
      ))}
    </div>
  );
}

function LinesTab({ lines }: any) {
  if (lines.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No line-level changes detected</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lines.map((line: any, idx: number) => (
        <div key={idx} className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium">Line {idx + 1}</h4>
            <div className="text-sm">
              <span className="text-gray-600">${line.price_from.toFixed(2)}</span>
              <span className="mx-2">→</span>
              <span className="font-semibold">${line.price_to.toFixed(2)}</span>
              <span
                className={`ml-2 ${
                  line.delta > 0 ? 'text-red-600' : 'text-green-600'
                }`}
              >
                ({line.delta > 0 ? '+' : ''}
                {(line.delta_pct * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {line.factor_deltas.map((fd: any, fdIdx: number) => (
              <FactorDeltaBadge
                key={fdIdx}
                factor={fd.factor}
                delta={fd.delta}
                pct={fd.pct}
                from={fd.from}
                to={fd.to}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function generateCsv(diff: any): string {
  const rows: string[] = [];
  rows.push('Type,Path/Factor,From,To,Delta,Delta %');

  // Fields
  for (const field of diff.fields) {
    rows.push(
      `Field,${field.path},${JSON.stringify(field.from)},${JSON.stringify(field.to)},,`
    );
  }

  // Factors
  for (const factor of diff.by_factor) {
    rows.push(
      `Factor,${factor.factor},${factor.from || 0},${factor.to || 0},${factor.delta},${(factor.pct * 100).toFixed(2)}%`
    );
  }

  return rows.join('\n');
}
