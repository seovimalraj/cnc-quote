'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CubeIcon,
  DocumentIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  EyeIcon,
  CogIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import Model3DViewer from '@/components/Model3DViewer';
import InlinePartConfiguration from '@/components/InlinePartConfiguration';

interface Quote {
  id: string;
  status: 'Draft' | 'Analyzing' | 'Priced' | 'Needs_Review' | 'Reviewed' | 'Sent' | 'Accepted' | 'Expired' | 'Abandoned';
  subtotal: number;
  currency: string;
  lines: QuoteLine[];
  selectedLeadOptionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface QuoteLine {
  id: string;
  fileId: string;
  fileName: string;
  process: 'CNC' | 'SheetMetal' | 'InjectionMolding';
  material: string;
  finish?: string;
  qty: number;
  status: 'Analyzing' | 'Priced' | 'Needs_Review' | 'Error';
  pricingBreakdown?: PricingBreakdown;
  leadTimeOptions?: LeadOption[];
  thumbnail?: string;
}

interface PricingBreakdown {
  setup_time_min: number;
  cycle_time_min: number;
  machine_rate_per_hr: number;
  material_buy_cost: number;
  material_waste_factor: number;
  tooling_wear_cost: number;
  finish_cost: number;
  inspection_cost: number;
  risk_adder: number;
  overhead: number;
  margin: number;
  unit_price: number;
}

interface LeadOption {
  id: string;
  region: 'USA' | 'International';
  speed: 'Economy' | 'Standard' | 'Expedite';
  business_days: number;
  unit_price: number;
  msrp: number;
  savings_text: string;
}

interface DFMCheck {
  id: string;
  name: string;
  status: 'pass' | 'warning' | 'blocker';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export default function QuotePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [dfmChecks, setDfmChecks] = useState<DFMCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  // Mock DFM checks for demonstration
  const mockDfmChecks: DFMCheck[] = [
    { id: '1', name: 'Wall Thickness', status: 'pass', message: 'All walls meet minimum thickness requirements', severity: 'low' },
    { id: '2', name: 'Draft Angles', status: 'warning', message: 'Some features could benefit from draft angles', severity: 'medium' },
    { id: '3', name: 'Undercuts', status: 'blocker', message: 'Undercuts detected - may require special tooling', severity: 'high' },
    { id: '4', name: 'Hole Sizes', status: 'pass', message: 'All holes meet standard drill sizes', severity: 'low' },
    { id: '5', name: 'Surface Finish', status: 'pass', message: 'Surface finish requirements achievable', severity: 'low' },
  ];

  useEffect(() => {
    const fromDfm = searchParams.get('from') === 'dfm';
    const preparing = searchParams.get('preparing') === 'true';

    if (fromDfm && preparing) {
      setIsPreparing(true);
      // Poll for pricing completion
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/quotes/${quoteId}`);
          if (response.ok) {
            const quoteData = await response.json();
            setQuote(quoteData);

            // Check if pricing is complete
            if (quoteData.lines && quoteData.lines.length > 0) {
              const allPriced = quoteData.lines.every((line: QuoteLine) =>
                line.status === 'Priced' || line.status === 'Needs_Review'
              );

              if (allPriced) {
                setIsPreparing(false);
                clearInterval(pollInterval);

                // Auto-select first line
                setSelectedLineId(quoteData.lines[0].id);
              }
            }
          }
        } catch (error) {
          console.error('Error polling quote status:', error);
        }
      }, 2000); // Poll every 2 seconds

      // Stop polling after 30 seconds as fallback
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsPreparing(false);
      }, 30000);

      return () => clearInterval(pollInterval);
    } else {
      loadQuote();
    }
  }, [quoteId, searchParams]);

  const loadQuote = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/quotes/${quoteId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Quote not found');
        } else if (response.status === 403) {
          setError('Access denied. Please complete the lead form first.');
        } else {
          setError('Failed to load quote');
        }
        return;
      }

      const quoteData = await response.json();
      setQuote(quoteData);
      setDfmChecks(mockDfmChecks);

      // Auto-select first line if available
      if (quoteData.lines && quoteData.lines.length > 0) {
        setSelectedLineId(quoteData.lines[0].id);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadTimeSelect = async (leadOptionId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}/lead`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_option_id: leadOptionId })
      });

      if (response.ok) {
        const updatedQuote = await response.json();
        setQuote(updatedQuote);
      }
    } catch (error) {
      console.error('Failed to update lead time:', error);
    }
  };

  const handleCheckout = async () => {
    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId,
          currency: quote?.currency || 'USD'
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  };

  const getStatusIcon = (status: QuoteLine['status']) => {
    switch (status) {
      case 'Analyzing':
        return <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />;
      case 'Priced':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'Needs_Review':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />;
      case 'Error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      default:
        return <DocumentIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: QuoteLine['status']) => {
    switch (status) {
      case 'Analyzing':
        return <Badge variant="secondary">Analyzing...</Badge>;
      case 'Priced':
        return <Badge className="bg-green-100 text-green-800">Priced</Badge>;
      case 'Needs_Review':
        return <Badge className="bg-yellow-100 text-yellow-800">Needs Review</Badge>;
      case 'Error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getDfmStatusColor = (status: DFMCheck['status']) => {
    switch (status) {
      case 'pass': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'blocker': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const hasDfmBlockers = dfmChecks.some(check => check.status === 'blocker');
  const canCheckout = quote?.selectedLeadOptionId && !hasDfmBlockers;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/instant-quote')}>
              Start New Quote
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isPreparing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Preparing Your Quote</h2>
            <p className="text-gray-600 mb-4">
              We're analyzing your DFM results and calculating pricing options...
            </p>
            <div className="flex items-center justify-center space-x-2">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600">This usually takes 2-5 seconds</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quote) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <CubeIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Quote {quote.id}</span>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <DocumentIcon className="w-4 h-4 mr-2" />
                Save Quote
              </Button>
              <Button variant="outline" size="sm">
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Parts Panel */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Parts ({quote.lines?.length || 0})
                  <Button size="sm" variant="outline">
                    <DocumentIcon className="w-4 h-4 mr-2" />
                    Add Parts
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(quote.lines || []).map((line) => (
                  <div
                    key={line.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedLineId === line.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedLineId(line.id)}
                  >
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(line.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{line.fileName}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-sm text-gray-600">Qty: {line.qty}</span>
                          {getStatusBadge(line.status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm text-gray-600">{line.process}</span>
                      <div className="flex space-x-1">
                        <Button size="sm" variant="ghost" onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/quote/${quoteId}/configure/${line.id}`);
                        }}>
                          <CogIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Viewer & DFM Panel */}
          <div className="lg:col-span-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>3D Viewer & DFM Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="viewer" className="h-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="viewer">3D Viewer</TabsTrigger>
                    <TabsTrigger value="dfm">DFM Checks ({dfmChecks.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="viewer" className="mt-4">
                    <div className="h-96">
                      {selectedLineId ? (
                        <Model3DViewer
                          fileName={quote.lines.find(l => l.id === selectedLineId)?.fileName}
                          fileType="CAD Model"
                        />
                      ) : (
                        <div className="bg-gray-100 rounded-lg h-full flex items-center justify-center">
                          <div className="text-center">
                            <CubeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">3D Viewer</p>
                            <p className="text-sm text-gray-500 mt-2">
                              Select a part to view its 3D model
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="dfm" className="mt-4">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {dfmChecks.map((check) => (
                        <div
                          key={check.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            check.status === 'blocker' ? 'border-red-200 bg-red-50' :
                            check.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                            'border-green-200 bg-green-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {check.status === 'pass' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                              {check.status === 'warning' && <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />}
                              {check.status === 'blocker' && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                              <span className="font-medium">{check.name}</span>
                            </div>
                            <Badge variant={
                              check.status === 'pass' ? 'default' :
                              check.status === 'warning' ? 'secondary' :
                              'destructive'
                            }>
                              {check.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Summary Panel */}
          <div className="lg:col-span-3">
            <div className="sticky top-8 space-y-6">
              {/* Lead Time Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ClockIcon className="w-5 h-5 mr-2" />
                    Lead Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Made in USA</h4>
                    <div className="space-y-2">
                      {[
                        { id: 'usa-expedite', speed: 'Expedite', days: 3, price: 439.30 },
                        { id: 'usa-standard', speed: 'Standard', days: 4, price: 227.98 },
                        { id: 'usa-economy', speed: 'Economy', days: 7, price: 186.28 }
                      ].map((option) => (
                        <div
                          key={option.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            quote.selectedLeadOptionId === option.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleLeadTimeSelect(option.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{option.speed}</p>
                              <p className="text-sm text-gray-600">{option.days} business days</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">${option.price}</p>
                              <p className="text-xs text-gray-500">per part</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Made Internationally</h4>
                    <div className="space-y-2">
                      <div
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          quote.selectedLeadOptionId === 'intl-economy'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleLeadTimeSelect('intl-economy')}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Economy</p>
                            <p className="text-sm text-gray-600">7 business days</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">$132.07</p>
                            <p className="text-xs text-gray-500">per part</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subtotal & Checkout */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                    Quote Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-2xl font-bold">${(quote.subtotal || 0).toFixed(2)}</span>
                  </div>

                  {hasDfmBlockers && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mr-2" />
                        <span className="text-sm text-red-700">
                          DFM issues must be resolved before checkout
                        </span>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    size="lg"
                    disabled={!canCheckout}
                    onClick={handleCheckout}
                  >
                    <ShoppingCartIcon className="w-5 h-5 mr-2" />
                    {canCheckout ? 'Continue to Checkout' : 'Select Lead Time'}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Prices include all applicable taxes and fees
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Inline Part Configuration */}
        {selectedLineId && (
          <InlinePartConfiguration
            quoteId={quoteId}
            lineId={selectedLineId}
            onSpecsChange={() => {
              // Refresh quote data when specs change
              loadQuote();
            }}
          />
        )}
      </div>
    </div>
  );
}
