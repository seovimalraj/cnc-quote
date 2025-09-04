'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { DFMPanel } from '@/components/dfm/DFMPanel';
import { Viewer3D } from '@/components/viewer/Viewer3D';
import {
  ChevronLeftIcon,
  CubeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { posthog } from 'posthog-js';

// Types based on specification
interface DFMCheck {
  id: string;
  title: string;
  status: 'pass' | 'warning' | 'blocker';
  message: string;
  metrics: Record<string, any>;
  suggestions: string[];
  highlights: { face_ids: number[]; edge_ids: number[] };
}

interface DFMResult {
  summary: { pass: number; warn: number; blocker: number };
  checks: DFMCheck[];
  task_id: string;
}

export default function AnalyzeDFMPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  const lineId = params.line_id as string;

  const [dfmResult, setDfmResult] = useState<DFMResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCheck, setSelectedCheck] = useState<DFMCheck | null>(null);
  const [showHighlights, setShowHighlights] = useState(true);

  // Mock DFM data
  const mockDFMResult: DFMResult = {
    summary: { pass: 15, warn: 2, blocker: 1 },
    task_id: 'task-123',
    checks: [
      {
        id: 'check-1',
        title: 'Wall Thickness',
        status: 'pass',
        message: 'All wall thicknesses are within acceptable range (min 0.8mm, found 2.5-5.0mm)',
        metrics: { min_thickness: 2.5, max_thickness: 5.0, acceptable_min: 0.8 },
        suggestions: [],
        highlights: { face_ids: [], edge_ids: [] },
      },
      {
        id: 'check-2',
        title: 'Hole Depth Ratio',
        status: 'warning',
        message: 'Some holes have depth-to-diameter ratios above 5:1, which may affect tool life',
        metrics: { max_ratio: 6.2, recommended_max: 5.0 },
        suggestions: [
          'Consider reducing hole depth or increasing diameter',
          'Use specialized tooling for deep holes',
          'Add intermediate pecking operations'
        ],
        highlights: { face_ids: [1, 2], edge_ids: [5, 6] },
      },
      {
        id: 'check-3',
        title: 'Undercut Features',
        status: 'blocker',
        message: 'Part contains undercut features that cannot be machined with standard tools',
        metrics: { undercut_count: 2, undercut_depth: 3.5 },
        suggestions: [
          'Redesign to eliminate undercuts',
          'Split part into multiple components',
          'Use EDM for undercut features'
        ],
        highlights: { face_ids: [3, 4], edge_ids: [7, 8] },
      },
      {
        id: 'check-4',
        title: 'Surface Finish Requirements',
        status: 'pass',
        message: 'Surface finish requirements are achievable with standard machining',
        metrics: { required_roughness: 1.6, achievable_roughness: 1.2 },
        suggestions: [],
        highlights: { face_ids: [], edge_ids: [] },
      },
    ],
  };

  useEffect(() => {
    // Track page view
    posthog.capture('dfm_view', { quote_id: quoteId, line_id: lineId });

    // Simulate API call
    const fetchDFMResult = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500));
      setDfmResult(mockDFMResult);
      setLoading(false);
    };

    fetchDFMResult();
  }, [quoteId, lineId]);

  const handleCheckClick = (check: DFMCheck) => {
    setSelectedCheck(check);
    posthog.capture('dfm_check_open', {
      quote_id: quoteId,
      line_id: lineId,
      check_id: check.id,
      status: check.status
    });

    // In real implementation: send message to 3D viewer to highlight faces/edges
    if (showHighlights && check.highlights.face_ids.length > 0) {
      console.log('Highlighting faces:', check.highlights.face_ids);
      console.log('Highlighting edges:', check.highlights.edge_ids);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'blocker':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'blocker':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading || !dfmResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="h-96 bg-gray-200 rounded"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
              <div className="h-[600px] bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button
                onClick={() => router.push('/portal/dashboard')}
                className="hover:text-gray-900"
              >
                Dashboard
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <button
                onClick={() => router.push('/portal/quotes')}
                className="hover:text-gray-900"
              >
                Quotes
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <button
                onClick={() => router.push(`/portal/quotes/${quoteId}`)}
                className="hover:text-gray-900"
              >
                {quoteId}
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="font-medium text-gray-900">DFM Analysis</span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowHighlights(!showHighlights)}
                className="flex items-center space-x-1"
              >
                {showHighlights ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
                <span>{showHighlights ? 'Hide' : 'Show'} Highlights</span>
              </Button>
              <Button
                onClick={() => router.push(`/portal/quotes/${quoteId}/configure/${lineId}`)}
                className="flex items-center space-x-1"
              >
                <span>Back to Configure</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - DFM Panel */}
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CubeIcon className="h-5 w-5" />
                  <span>DFM Analysis Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 mb-2">
                    {dfmResult.summary.pass} checks passed | {dfmResult.summary.warn} warnings | {dfmResult.summary.blocker} blockers
                  </div>
                  <div className="flex justify-center space-x-4 mt-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      <span className="text-sm text-gray-600">{dfmResult.summary.pass} Passed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm text-gray-600">{dfmResult.summary.warn} Warnings</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <XCircleIcon className="h-5 w-5 text-red-500" />
                      <span className="text-sm text-gray-600">{dfmResult.summary.blocker} Blockers</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Checks List */}
            <Card>
              <CardHeader>
                <CardTitle>Design for Manufacturability Checks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {dfmResult.checks.map((check) => (
                    <div
                      key={check.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedCheck?.id === check.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleCheckClick(check)}
                    >
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(check.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-gray-900">{check.title}</h4>
                            <Badge className={getStatusColor(check.status)}>
                              {check.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{check.message}</p>

                          {check.metrics && Object.keys(check.metrics).length > 0 && (
                            <div className="mb-3">
                              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Metrics
                              </h5>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                {Object.entries(check.metrics).map(([key, value]) => (
                                  <div key={key} className="flex justify-between">
                                    <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span>
                                    <span className="font-medium">{String(value)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {check.suggestions.length > 0 && (
                            <div>
                              <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                Suggestions
                              </h5>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {check.suggestions.map((suggestion, index) => (
                                  <li key={index} className="flex items-start space-x-2">
                                    <span className="text-gray-400 mt-1">•</span>
                                    <span>{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resolve Blockers CTA */}
            {dfmResult.summary.blocker > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <XCircleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-medium text-red-800 mb-2">
                        {dfmResult.summary.blocker} Critical Issue{dfmResult.summary.blocker > 1 ? 's' : ''} Found
                      </h3>
                      <p className="text-sm text-red-700 mb-4">
                        These issues must be resolved before the part can be manufactured.
                        Please review the suggestions above and modify your design accordingly.
                      </p>
                      <Button
                        onClick={() => router.push(`/portal/quotes/${quoteId}/configure/${lineId}`)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Back to Configure to Resolve
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - 3D Viewer */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>3D Model with Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[600px] bg-gray-100 rounded-lg flex items-center justify-center relative">
                  <Viewer3D fileId="file-123" />
                  {selectedCheck && showHighlights && (
                    <div className="absolute top-4 left-4 bg-white rounded-lg p-3 shadow-lg max-w-xs">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(selectedCheck.status)}
                        <span className="font-medium text-sm">{selectedCheck.title}</span>
                      </div>
                      <p className="text-xs text-gray-600">{selectedCheck.message}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  100 × 50 × 25 mm | 3.94 × 1.97 × 0.98 in | 0.008 ft³
                </div>
                {selectedCheck && selectedCheck.highlights.face_ids.length > 0 && (
                  <div className="mt-2 text-xs text-blue-600">
                    Highlighting {selectedCheck.highlights.face_ids.length} face(s) and {selectedCheck.highlights.edge_ids.length} edge(s)
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
