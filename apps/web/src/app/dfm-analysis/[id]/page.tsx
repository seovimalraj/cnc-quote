'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CogIcon,
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface DFMRequest {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  file_name: string;
  created_at: string;
  tolerance_pack: string;
  surface_finish: string;
  industry: string;
  criticality: string;
  results?: DFMResults;
}

interface DFMResults {
  overall_score: number;
  checks: DFMCheck[];
  recommendations: string[];
  cost_impact: number;
  processing_time: number;
}

interface DFMCheck {
  id: string;
  name: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
}

export default function DFMResultsPage() {
  const params = useParams();
  const requestId = params.id as string;

  const [request, setRequest] = useState<DFMRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (requestId) {
      loadRequest();
      // Start polling for updates
      const interval = setInterval(loadRequest, 5000); // Poll every 5 seconds
      setPollingInterval(interval);
    }

    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [requestId]);

  const loadRequest = async () => {
    try {
      const response = await fetch(`/api/dfm/requests/${requestId}`);
      if (response.ok) {
        const data = await response.json();
        setRequest(data);

        // Stop polling if analysis is complete or failed
        if (data.status === 'completed' || data.status === 'failed') {
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
        }
      } else {
        setError('Failed to load DFM request');
      }
    } catch (err) {
      setError('Failed to load DFM request');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-600" />;
      case 'processing':
        return <CogIcon className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCheckStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading DFM analysis...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ {error || 'Analysis not found'}</div>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              {getStatusIcon(request.status)}
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">DFM Analysis Results</h1>
                <p className="text-sm text-gray-600">Request #{request.id}</p>
              </div>
            </div>
            <Badge className={getStatusColor(request.status)}>
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {request.status === 'pending' && (
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <ClockIcon className="mx-auto h-16 w-16 text-yellow-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Queued</h2>
              <p className="text-gray-600 mb-4">
                Your DFM analysis has been queued and will start processing shortly.
              </p>
              <div className="flex items-center justify-center space-x-2">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span className="text-sm text-gray-600">Waiting to start...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {request.status === 'processing' && (
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <CogIcon className="mx-auto h-16 w-16 text-blue-600 mb-4 animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis in Progress</h2>
              <p className="text-gray-600 mb-4">
                We're analyzing your CAD file for manufacturability. This usually takes 2-5 minutes.
              </p>
              <Progress value={65} className="w-full max-w-md mx-auto" />
              <p className="text-sm text-gray-600 mt-2">Processing 20-point analysis...</p>
            </CardContent>
          </Card>
        )}

        {request.status === 'failed' && (
          <Card className="mb-8">
            <CardContent className="p-8 text-center">
              <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analysis Failed</h2>
              <p className="text-gray-600 mb-4">
                We encountered an error while analyzing your file. Please try again or contact support.
              </p>
              <Button onClick={() => window.location.href = '/dfm-analysis'}>
                Start New Analysis
              </Button>
            </CardContent>
          </Card>
        )}

        {request.status === 'completed' && request.results && (
          <div className="space-y-8">
            {/* Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {request.results.overall_score}/100
                  </div>
                  <p className="text-sm text-gray-600">Overall Score</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {request.results.checks.filter(c => c.status === 'pass').length}
                  </div>
                  <p className="text-sm text-gray-600">Checks Passed</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {request.results.checks.filter(c => c.status === 'fail').length}
                  </div>
                  <p className="text-sm text-gray-600">Issues Found</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Results */}
            <Card>
              <CardHeader>
                <CardTitle>20-Point Analysis Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {request.results.checks.map((check) => (
                    <div key={check.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium">{check.name}</h3>
                            <Badge className={getCheckStatusColor(check.status)}>
                              {check.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{check.message}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Category: {check.category}</span>
                            <span>Severity: {check.severity}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {request.results.recommendations.map((rec, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{rec}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cost Impact */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Impact Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    ${request.results.cost_impact.toFixed(2)}
                  </div>
                  <p className="text-sm text-gray-600">Estimated cost impact from optimizations</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Request Details */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Analysis Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium mb-2">File Information</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">File:</span> {request.file_name}</p>
                  <p><span className="font-medium">Submitted:</span> {new Date(request.created_at).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">Analysis Parameters</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <p><span className="font-medium">Tolerance:</span> {request.tolerance_pack}</p>
                  <p><span className="font-medium">Finish:</span> {request.surface_finish}</p>
                  <p><span className="font-medium">Industry:</span> {request.industry}</p>
                  <p><span className="font-medium">Criticality:</span> {request.criticality}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button variant="outline" onClick={() => window.location.href = '/dfm-analysis'}>
            Start New Analysis
          </Button>
          {request.status === 'completed' && (
            <Button>
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
