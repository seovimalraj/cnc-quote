/**
 * Step 17: Routing Workbench Page
 * Manual order routing with candidate scoring
 */

'use client';

import { useState } from 'react';
import {
  Search,
  Package,
  Building2,
  MapPin,
  Star,
  CheckCircle2,
  AlertCircle,
  Award,
  Clock,
  DollarSign,
} from 'lucide-react';
import { useCandidates, useAssignSupplier } from '@/lib/api/useMarketplace';
import type { CandidateScore, GetCandidatesDto } from '@cnc-quote/shared';

export default function RoutingPage() {
  const [orderId, setOrderId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateScore | null>(
    null,
  );
  const [routingNotes, setRoutingNotes] = useState('');

  const dto: GetCandidatesDto = {
    orderId,
    process: 'CNC_MILLING', // TODO: Get from order
    material: 'aluminum_6061', // TODO: Get from order
    quantity: 1, // TODO: Get from order
  };

  const { data: candidatesData, isLoading, error } = useCandidates(dto);
  const assignMutation = useAssignSupplier(orderId);

  const handleAssign = async () => {
    if (!selectedCandidate) return;

    const leadtimeMin = selectedCandidate.capability?.leadtimeDaysMin || 0;
    const leadtimeMax = selectedCandidate.capability?.leadtimeDaysMax || 0;

    if (
      !confirm(
        `Assign order to ${selectedCandidate.supplierName}?\n\nScore: ${(selectedCandidate.score * 100).toFixed(0)}%\nLead time: ${leadtimeMin}-${leadtimeMax} days`,
      )
    ) {
      return;
    }

    await assignMutation.mutateAsync({
      supplierId: selectedCandidate.supplierId,
      note: routingNotes || undefined,
    });

    setOrderId('');
    setSelectedCandidate(null);
    setRoutingNotes('');
  };

  return (
    <div className="h-full flex">
      {/* Left Panel: Order Picker + Requirements */}
      <div className="w-96 border-r bg-gray-50 flex flex-col">
        <div className="p-4 border-b bg-white">
          <h2 className="text-lg font-semibold mb-3">Select Order</h2>
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search order ID or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="mt-3">
            <input
              type="text"
              placeholder="Enter order ID"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {orderId && candidatesData && (
          <div className="p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Order: {candidatesData.orderId.slice(0, 8)}
            </h3>
            <div className="bg-white rounded-lg border p-3 space-y-2 text-sm">
              <div className="text-gray-600">
                {candidatesData.matchCount} candidates found
              </div>
              <div className="text-gray-600">
                {candidatesData.totalEvaluated} suppliers evaluated
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel: Candidates List */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Candidate Suppliers</h2>
              {candidatesData && (
                <p className="text-sm text-gray-600 mt-1">
                  {candidatesData.candidates.length} matches found
                </p>
              )}
            </div>
            {selectedCandidate && (
              <button
                onClick={handleAssign}
                disabled={assignMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                <CheckCircle2 size={16} />
                {assignMutation.isPending ? 'Assigning...' : 'Assign Order'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!orderId ? (
            <div className="text-center py-12">
              <Package size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600">Enter an order ID to find suppliers</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-2 text-gray-600">Finding candidates...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle size={48} className="mx-auto text-red-400 mb-3" />
              <p className="text-red-600">{(error as Error).message}</p>
            </div>
          ) : candidatesData?.candidates.length === 0 ? (
            <div className="text-center py-12">
              <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-600">No suppliers available for this order</p>
            </div>
          ) : (
            <div className="space-y-3">
              {candidatesData?.candidates.map((candidate) => (
                <CandidateCard
                  key={`${candidate.supplierId}-${candidate.capability?.id || 'default'}`}
                  candidate={candidate}
                  isSelected={
                    selectedCandidate?.supplierId === candidate.supplierId
                  }
                  onSelect={() => setSelectedCandidate(candidate)}
                />
              ))}
            </div>
          )}

          {/* Routing Notes */}
          {selectedCandidate && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Routing Notes (optional)
              </label>
              <textarea
                value={routingNotes}
                onChange={(e) => setRoutingNotes(e.target.value)}
                placeholder="Add internal notes about this routing decision..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Candidate Card Component
function CandidateCard({
  candidate,
  isSelected,
  onSelect,
}: {
  candidate: CandidateScore;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const scorePercent = Math.round(candidate.score * 100);
  const scoreColor =
    scorePercent >= 80
      ? 'bg-green-500'
      : scorePercent >= 60
        ? 'bg-yellow-500'
        : 'bg-orange-500';

  return (
    <div
      onClick={onSelect}
      className={`bg-white border rounded-lg p-4 cursor-pointer transition ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-gray-400'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Building2 size={20} className="text-gray-400" />
          <div>
            <h3 className="font-semibold text-gray-900">
              {candidate.supplierName}
            </h3>
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-0.5">
              <MapPin size={12} />
              {candidate.supplierRegions?.join(', ') || 'N/A'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${scoreColor}`} />
            <span className="text-lg font-bold text-gray-900">{scorePercent}%</span>
          </div>
          <div className="text-xs text-gray-500">match</div>
        </div>
      </div>

      {/* Certifications */}
      {candidate.supplierCertifications && candidate.supplierCertifications.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {candidate.supplierCertifications.map((cert: string) => (
            <span
              key={cert}
              className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
            >
              <Award size={10} />
              {cert}
            </span>
          ))}
        </div>
      )}

      {/* Capability Details */}
      <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-gray-400" />
          <span className="text-gray-600">
            {candidate.capability?.leadtimeDaysMin || 0}-
            {candidate.capability?.leadtimeDaysMax || 0}d
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          <span className="text-gray-600">
            {candidate.supplierRating?.toFixed(1) || 'N/A'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign size={14} className="text-gray-400" />
          <span className="text-gray-600">
            {candidate.capability?.unitCostIndex?.toFixed(1) || '1.0'}x
          </span>
        </div>
      </div>

      {/* Reasons */}
      {candidate.reasons.length > 0 && (
        <div className="space-y-1">
          {candidate.reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <CheckCircle2 size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Penalties */}
      {(candidate.softPenalties || candidate.penalties || []).length > 0 && (
        <div className="space-y-1 mt-2">
          {(candidate.softPenalties || candidate.penalties || []).map((penalty: string, idx: number) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <AlertCircle size={12} className="text-orange-500 mt-0.5 flex-shrink-0" />
              <span className="text-gray-600">{penalty}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
