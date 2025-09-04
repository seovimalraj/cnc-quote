'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { DFMPanel } from '@/components/dfm/DFMPanel'
import { Viewer3D } from '@/components/viewer/Viewer3D'
import {
  ChevronLeftIcon,
  HomeIcon,
  DocumentTextIcon,
  ShareIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  MinusIcon,
  CubeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  AdjustmentsHorizontalIcon,
  DocumentIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { posthog } from 'posthog-js';

// Types based on specification
interface Quote {
  id: string;
  organization_id: string;
  status: 'Draft' | 'Analyzing' | 'Priced' | 'Needs_Review' | 'Reviewed' | 'Sent' | 'Accepted' | 'Expired' | 'Abandoned';
  source: 'web' | 'widget' | 'large_order';
  currency: string;
  lines: QuoteLine[];
  selected_lead_option_ids: Record<string, string>;
  subtotal: number;
  promo_code: string | null;
  created_at: string;
  updated_at: string;
}

interface QuoteLine {
  id: string;
  file_id: string;
  file_name: string;
  thumb_url: string;
  qty: number;
  process: 'CNC' | 'SheetMetal' | 'InjectionMolding';
  material: string;
  finish: string | null;
  dfm_summary: { pass: number; warn: number; blocker: number };
  lead_time_options: LeadOption[];
  unit_price: number;
  total_price: number;
}

interface LeadOption {
  id: string;
  region: 'USA' | 'International';
  speed: 'Economy' | 'Standard' | 'Expedite';
  business_days: number;
  unit_price: number;
  msrp: number;
  savings_text: string;
  eta_date: string;
}

interface ActivityEvent {
  id: string;
  quote_id: string;
  line_id: string | null;
  user_id: string;
  name: string;
  ts: string;
  props: Record<string, any>;
}

// Mock data based on specification
const mockQuoteData: Quote = {
  id: 'Q-2024-001',
  organization_id: 'org-123',
  status: 'Priced',
  source: 'web',
  currency: 'USD',
  lines: [
    {
      id: 'line-1',
      file_id: 'file-123',
      file_name: 'bracket.step',
      thumb_url: '/api/placeholder/100/100',
      qty: 50,
      process: 'CNC',
      material: 'Aluminum 6061',
      finish: 'Anodized',
      dfm_summary: { pass: 15, warn: 2, blocker: 0 },
      lead_time_options: [
        {
          id: 'lead-1',
          region: 'USA',
          speed: 'Standard',
          business_days: 10,
          unit_price: 45.50,
          msrp: 52.00,
          savings_text: 'Save $6.50',
          eta_date: '2024-09-20T00:00:00Z',
        },
        {
          id: 'lead-2',
          region: 'USA',
          speed: 'Expedite',
          business_days: 5,
          unit_price: 52.75,
          msrp: 60.00,
          savings_text: 'Save $7.25',
          eta_date: '2024-09-15T00:00:00Z',
        },
      ],
      unit_price: 45.50,
      total_price: 2275.00,
    },
    {
      id: 'line-2',
      file_id: 'file-456',
      file_name: 'housing.iges',
      thumb_url: '/api/placeholder/100/100',
      qty: 25,
      process: 'SheetMetal',
      material: 'Steel 304',
      finish: null,
      dfm_summary: { pass: 12, warn: 3, blocker: 1 },
      lead_time_options: [
        {
          id: 'lead-3',
          region: 'USA',
          speed: 'Economy',
          business_days: 15,
          unit_price: 38.25,
          msrp: 45.00,
          savings_text: 'Save $6.75',
          eta_date: '2024-09-25T00:00:00Z',
        },
      ],
      unit_price: 38.25,
      total_price: 956.25,
    },
  ],
  selected_lead_option_ids: { 'line-1': 'lead-1' },
  subtotal: 3231.25,
  promo_code: null,
  created_at: '2024-09-10T10:00:00Z',
  updated_at: '2024-09-12T14:30:00Z',
};

const mockActivityEvents: ActivityEvent[] = [
  {
    id: 'act-1',
    quote_id: 'Q-2024-001',
    line_id: 'line-1',
    user_id: 'user-123',
    name: 'line_qty_changed',
    ts: '2024-09-12T14:30:00Z',
    props: { old_qty: 45, new_qty: 50 },
  },
  {
    id: 'act-2',
    quote_id: 'Q-2024-001',
    line_id: null,
    user_id: 'user-123',
    name: 'quote_created',
    ts: '2024-09-10T10:00:00Z',
    props: { source: 'web' },
  },
];

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState<Quote>(mockQuoteData);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>(mockActivityEvents);
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Track page view
    posthog.capture('quote_detail_view', { quote_id: quoteId });
  }, [quoteId]);

  const handleQtyChange = async (lineId: string, newQty: number) => {
    if (newQty < 1) return;

    setLoading(true);
    try {
      // In real implementation: await fetch(`/api/quotes/${quoteId}/lines/${lineId}`, { method: 'PUT', body: JSON.stringify({ qty: newQty }) })
      setQuote(prev => ({
        ...prev,
        lines: prev.lines.map(line =>
          line.id === lineId
            ? { ...line, qty: newQty, total_price: line.unit_price * newQty }
            : line
        ),
        subtotal: prev.lines.reduce((sum, line) =>
          line.id === lineId
            ? sum + (line.unit_price * newQty)
            : sum + line.total_price,
          0
        ),
      }));

      posthog.capture('line_qty_changed', { quote_id: quoteId, line_id: lineId, new_qty: newQty });
    } catch (error) {
      console.error('Failed to update quantity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeadTimeSelect = async (lineId: string, leadOptionId: string) => {
    setLoading(true);
    try {
      // In real implementation: await fetch(`/api/quotes/${quoteId}/lead`, { method: 'PUT', body: JSON.stringify({ line_id: lineId, lead_option_id: leadOptionId }) })
      setQuote(prev => ({
        ...prev,
        selected_lead_option_ids: { ...prev.selected_lead_option_ids, [lineId]: leadOptionId },
      }));

      posthog.capture('lead_option_selected', { quote_id: quoteId, line_id: lineId, lead_option_id: leadOptionId });
    } catch (error) {
      console.error('Failed to select lead time:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;

    setLoading(true);
    try {
      // In real implementation: await fetch(`/api/quotes/${quoteId}/apply-promo`, { method: 'PUT', body: JSON.stringify({ code: promoCode }) })
      setQuote(prev => ({ ...prev, promo_code: promoCode }));
      setPromoCode('');

      posthog.capture('promo_applied', { quote_id: quoteId, promo_code: promoCode });
    } catch (error) {
      console.error('Failed to apply promo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // In real implementation: await fetch(`/api/quotes/${quoteId}/pdf`, { method: 'POST' })
      posthog.capture('quote_pdf_generate', { quote_id: quoteId });
      console.log('Downloading PDF...');
    } catch (error) {
      console.error('Failed to generate PDF:', error);
    }
  };

  const handleShareLink = async () => {
    try {
      // In real implementation: await fetch(`/api/quotes/${quoteId}/share-link`, { method: 'POST' })
      console.log('Generating share link...');
    } catch (error) {
      console.error('Failed to generate share link:', error);
    }
  };

  const handleEditConfiguration = (lineId: string) => {
    router.push(`/portal/quotes/${quoteId}/configure/${lineId}`);
  };

  const handleUploadDrawings = (lineId: string) => {
    router.push(`/portal/quotes/${quoteId}/attachments?line=${lineId}`);
  };

  const handleRemovePart = async (lineId: string) => {
    if (!confirm('Are you sure you want to remove this part?')) return;

    setLoading(true);
    try {
      // In real implementation: await fetch(`/api/quotes/${quoteId}/lines/${lineId}`, { method: 'DELETE' })
      setQuote(prev => ({
        ...prev,
        lines: prev.lines.filter(line => line.id !== lineId),
        selected_lead_option_ids: Object.fromEntries(
          Object.entries(prev.selected_lead_option_ids).filter(([key]) => key !== lineId)
        ),
      }));

      console.log('Part removed successfully');
    } catch (error) {
      console.error('Failed to remove part:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDfmBadgeColor = (dfm: { pass: number; warn: number; blocker: number }) => {
    if (dfm.blocker > 0) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (dfm.warn > 0) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  };

  const getDfmBadgeText = (dfm: { pass: number; warn: number; blocker: number }) => {
    if (dfm.blocker > 0) return `${dfm.blocker} blockers`;
    if (dfm.warn > 0) return `${dfm.warn} warnings`;
    return `${dfm.pass} checks passed`;
  };

  const getSelectedLeadTime = (line: QuoteLine) => {
    const selectedId = quote.selected_lead_option_ids[line.id];
    if (!selectedId) return null;

    return line.lead_time_options.find(opt => opt.id === selectedId);
  };

  const hasBlockers = () => {
    return quote.lines.some(line => line.dfm_summary.blocker > 0);
  };

  const hasLeadForAllLines = () => {
    return quote.lines.every(line => quote.selected_lead_option_ids[line.id]);
  };

  const canCheckout = () => {
    return !hasBlockers() && hasLeadForAllLines();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: quote.currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

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
                className="flex items-center hover:text-gray-900"
              >
                <HomeIcon className="h-4 w-4 mr-1" />
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
              <span className="font-medium text-gray-900">{quote.id}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                className="flex items-center space-x-1"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Download</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareLink}
                className="flex items-center space-x-1"
              >
                <ShareIcon className="w-4 h-4" />
                <span>Share</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Parts List */}
            <Card>
              <CardHeader>
                <CardTitle>Parts ({quote.lines.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quote.lines.map((line, index) => (
                    <div key={line.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start space-x-4">
                        <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                        <img
                          src={line.thumb_url}
                          alt={line.file_name}
                          className="w-12 h-12 rounded border flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium text-gray-900 truncate">{line.file_name}</h4>
                            <Badge className={getDfmBadgeColor(line.dfm_summary)}>
                              {getDfmBadgeText(line.dfm_summary)}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {line.process} • {line.material} • {line.finish || 'No finish'}
                          </p>

                          {/* Quantity Stepper */}
                          <div className="flex items-center space-x-4 mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Qty:</span>
                              <div className="flex items-center border rounded">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQtyChange(line.id, line.qty - 1)}
                                  disabled={line.qty <= 1 || loading}
                                >
                                  <MinusIcon className="h-4 w-4" />
                                </Button>
                                <span className="px-3 py-1 text-sm min-w-[3rem] text-center">{line.qty}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleQtyChange(line.id, line.qty + 1)}
                                  disabled={loading}
                                >
                                  <PlusIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              Unit: {formatCurrency(line.unit_price)}
                            </div>
                            <div className="text-sm font-medium">
                              Total: {formatCurrency(line.total_price)}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditConfiguration(line.id)}
                            className="flex items-center space-x-1"
                          >
                            <PencilIcon className="w-4 h-4" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUploadDrawings(line.id)}
                            className="flex items-center space-x-1"
                          >
                            <CloudArrowUpIcon className="w-4 h-4" />
                            <span>Drawings</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemovePart(line.id)}
                            className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                            <span>Remove</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upload More */}
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-8 text-center">
                <CubeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Upload Another 3D Model
                </h3>
                <p className="text-gray-600 mb-4">
                  Max size 200MB each. Supported: STEP, STL, IGES, DXF, and more
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <Button variant="outline">
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Recent Uploads
                  </Button>
                  <Button>
                    Browse Files
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Lead Time Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Lead Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="usa" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="usa">Made in USA</TabsTrigger>
                    <TabsTrigger value="international">Made Internationally</TabsTrigger>
                  </TabsList>

                  <TabsContent value="usa" className="space-y-4 mt-4">
                    {quote.lines.map(line => {
                      const usaOptions = line.lead_time_options.filter(opt => opt.region === 'USA');
                      return (
                        <div key={line.id} className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-900">{line.file_name}</h4>
                          {usaOptions.map(option => (
                            <div
                              key={option.id}
                              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                quote.selected_lead_option_ids[line.id] === option.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleLeadTimeSelect(line.id, option.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">
                                    {option.speed} - {option.business_days} Business Days
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {formatCurrency(option.unit_price)}
                                  </div>
                                </div>
                                {quote.selected_lead_option_ids[line.id] === option.id && (
                                  <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                                )}
                              </div>
                              {option.savings_text && (
                                <div className="text-xs text-green-600 mt-1">
                                  {option.savings_text}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="international" className="space-y-4 mt-4">
                    {quote.lines.map(line => {
                      const intlOptions = line.lead_time_options.filter(opt => opt.region === 'International');
                      return (
                        <div key={line.id} className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-900">{line.file_name}</h4>
                          {intlOptions.map(option => (
                            <div
                              key={option.id}
                              className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                                quote.selected_lead_option_ids[line.id] === option.id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                              onClick={() => handleLeadTimeSelect(line.id, option.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-sm">
                                    {option.speed} - {option.business_days} Business Days
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    {formatCurrency(option.unit_price)}
                                  </div>
                                </div>
                                {quote.selected_lead_option_ids[line.id] === option.id && (
                                  <CheckCircleIcon className="h-5 w-5 text-blue-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </TabsContent>
                </Tabs>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <InformationCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700">
                      <p className="font-medium">Order today to ship by:</p>
                      <p>Standard: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <Button variant="link" className="text-sm p-0 h-auto">
                    Learn More about Shipping and Lead Times
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Promo Box */}
            <Card>
              <CardHeader>
                <CardTitle>Promo Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    onClick={handleApplyPromo}
                    disabled={!promoCode.trim() || loading}
                  >
                    Apply
                  </Button>
                </div>
                {quote.promo_code && (
                  <div className="mt-2 text-sm text-green-600">
                    Promo "{quote.promo_code}" applied
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subtotal Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quote Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
                  </div>
                </div>

                <Separator className="my-4" />

                <Button
                  className="w-full"
                  disabled={!canCheckout() || loading}
                  onClick={() => {
                    posthog.capture('checkout_started', { quote_id: quoteId });
                    console.log('Starting checkout...');
                  }}
                >
                  Continue to Checkout
                </Button>

                {!canCheckout() && (
                  <div className="mt-2 text-sm text-red-600">
                    {hasBlockers() && "Resolve DFM blockers and "}
                    {!hasLeadForAllLines() && "select a lead time for all parts"}
                    {hasBlockers() && !hasLeadForAllLines() && " before proceeding"}
                  </div>
                )}

                <div className="mt-4">
                  <Button variant="outline" className="w-full">
                    Forward to Purchaser
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Activity Log */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activityEvents.slice(0, 10).map(event => (
                    <div key={event.id} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          {event.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {event.line_id && ` on ${quote.lines.find(l => l.id === event.line_id)?.file_name}`}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(event.ts)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
    { id: 'intl-economy', region: 'International', speed: 'Economy', business_days: 25, unit_price: 48.90, msrp: 55.00, savings_text: 'Save $6.10' },
    { id: 'intl-standard', region: 'International', speed: 'Standard', business_days: 18, unit_price: 58.75, msrp: 65.00, savings_text: 'Save $6.25' },
    { id: 'intl-expedite', region: 'International', speed: 'Expedite', business_days: 12, unit_price: 72.15, msrp: 80.00, savings_text: 'Save $7.85' }
  ]
};

export default function QuoteDetailsPage() {
  const params = useParams();
  const quoteId = params.id as string;

  const [quote, setQuote] = useState(mockQuoteData);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [leadTimeSelections, setLeadTimeSelections] = useState<Record<string, string>>({});
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromos, setAppliedPromos] = useState<string[]>([]);
  const [itarMode, setItarMode] = useState(false);

  // Calculate totals based on selections
  const calculateTotals = () => {
    let subtotal = 0;
    quote.items.forEach(item => {
      const leadTimeId = leadTimeSelections[item.id];
      const leadTimeOption = [...mockLeadTimeOptions.usa, ...mockLeadTimeOptions.international]
        .find(option => option.id === leadTimeId);

      const price = leadTimeOption ? leadTimeOption.unit_price : item.unit_price;
      subtotal += price * item.qty;
    });
    return subtotal;
  };

  const handleLeadTimeSelect = (itemId: string, leadTimeId: string) => {
    setLeadTimeSelections(prev => ({ ...prev, [itemId]: leadTimeId }));
  };

  const handleQtyChange = (itemId: string, newQty: number) => {
    setQuote(prev => ({
      ...prev,
      items: prev.items.map(item =>
        item.id === itemId ? { ...item, qty: Math.max(1, newQty) } : item
      )
    }));
  };

  const handleItemSelect = (itemId: string, selected: boolean) => {
    setSelectedItems(prev =>
      selected
        ? [...prev, itemId]
        : prev.filter(id => id !== itemId)
    );
  };

  const handleApplyPromo = () => {
    if (promoCode && !appliedPromos.includes(promoCode)) {
      setAppliedPromos(prev => [...prev, promoCode]);
      setPromoCode('');
    }
  };

  const getConfigSummary = (item: any) => {
    return `${item.process} • ${item.material} • ${item.dims.x_mm}×${item.dims.y_mm}×${item.dims.z_mm}mm • ${item.finish}`;
  };

  const getDfmStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'warn':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case 'blocker':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Breadcrumb */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <button className="flex items-center hover:text-gray-900">
                <HomeIcon className="h-4 w-4 mr-1" />
                Dashboard
              </button>
              <ChevronLeftIcon className="h-4 w-4" />
              <span>Quotes</span>
              <ChevronLeftIcon className="h-4 w-4" />
              <span className="font-medium text-gray-900">{quote.id}</span>
            </div>

            {/* Title */}
            <div className="flex-1 text-center">
              <h1 className="text-xl font-semibold text-gray-900">{quote.id}</h1>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Certifications
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={`/portal/quotes/${quoteId}/analyze`}>
                  <CubeIcon className="h-4 w-4 mr-2" />
                  Analyze DFM
                </a>
              </Button>
              <Button variant="outline" size="sm">
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <ShareIcon className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>

          {/* Toggles and Tools */}
          <div className="flex items-center justify-between py-3 border-t border-gray-200">
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2 text-sm">
                <Checkbox
                  checked={itarMode}
                  onCheckedChange={setItarMode}
                />
                <span>ITAR/EAR Controlled Handling</span>
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <EyeIcon className="h-4 w-4 mr-2" />
                Collapse All
              </Button>
              <Button variant="ghost" size="sm">
                <ClockIcon className="h-4 w-4 mr-2" />
                Recent Activity Log
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Parts List */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Parts ({quote.items.length})</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input placeholder="Search parts..." className="pl-10 w-64" />
                    </div>
                    <Button variant="outline" size="sm">
                      <FunnelIcon className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {quote.items.map((item, index) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex items-center space-x-4">
                        <Checkbox
                          checked={selectedItems.includes(item.id)}
                          onCheckedChange={(checked) => handleItemSelect(item.id, checked as boolean)}
                        />
                        <span className="text-sm font-medium text-gray-500 w-8">#{index + 1}</span>
                        <img
                          src={item.thumb_url}
                          alt={item.file_name}
                          className="w-12 h-12 rounded border"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-gray-900">{item.file_name}</h4>
                            <Badge variant="secondary">{item.version_tag}</Badge>
                            {getDfmStatusIcon(item.dfm.status)}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{getConfigSummary(item)}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm">
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button variant="outline" size="sm">
                            <ArrowPathIcon className="h-4 w-4 mr-2" />
                            Revise CAD
                          </Button>
                          <Button variant="outline" size="sm">
                            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                            Upload Drawings
                          </Button>
                          <Button variant="outline" size="sm">
                            <TrashIcon className="h-4 w-4 mr-2" />
                            Remove
                          </Button>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="mt-4 flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Qty:</span>
                          <div className="flex items-center border rounded">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQtyChange(item.id, item.qty - 1)}
                              disabled={item.qty <= 1}
                            >
                              <MinusIcon className="h-4 w-4" />
                            </Button>
                            <span className="px-3 py-1 text-sm">{item.qty}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleQtyChange(item.id, item.qty + 1)}
                            >
                              <PlusIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          Unit: ${leadTimeSelections[item.id] ?
                            [...mockLeadTimeOptions.usa, ...mockLeadTimeOptions.international]
              .find(opt => opt.id === leadTimeSelections[item.id])?.unit_price.toFixed(2) :
            item.unit_price.toFixed(2)}
                        </div>
                        <div className="text-sm font-medium">
                          Total: ${(leadTimeSelections[item.id] ?
                            [...mockLeadTimeOptions.usa, ...mockLeadTimeOptions.international]
              .find(opt => opt.id === leadTimeSelections[item.id])?.unit_price :
            item.unit_price * item.qty).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Upload More Card */}
            <Card className="border-2 border-dashed border-gray-300">
              <CardContent className="p-8 text-center">
                <CubeIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Upload Another 3D Model
                </h3>
                <p className="text-gray-600 mb-4">
                  Max size 200MB each. Supported: STEP, STL, IGES, DXF, and more
                </p>
                <div className="flex items-center justify-center space-x-4">
                  <Button variant="outline">
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Recent Uploads
                  </Button>
                  <Button>
                    Browse Files
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Legal Note */}
            <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
              <p>
                Quoted prices include applicable tariffs. Production orders may incur additional shipping duties.
              </p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Lead Time Selector */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Lead Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="usa" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="usa">USA</TabsTrigger>
                    <TabsTrigger value="international">International</TabsTrigger>
                  </TabsList>

                  <TabsContent value="usa" className="mt-4 space-y-3">
                    {mockLeadTimeOptions.usa.map((option) => (
                      <div key={option.id} className="space-y-2">
                        {quote.items.map((item) => (
                          <div key={`${item.id}-${option.id}`} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`lead-time-${item.id}`}
                              value={option.id}
                              checked={leadTimeSelections[item.id] === option.id}
                              onChange={() => handleLeadTimeSelect(item.id, option.id)}
                              className="text-blue-600"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{option.speed}</span>
                                <span className="text-sm text-green-600">{option.savings_text}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>{option.business_days} business days</span>
                                <span>${option.unit_price.toFixed(2)}/unit</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="international" className="mt-4 space-y-3">
                    {mockLeadTimeOptions.international.map((option) => (
                      <div key={option.id} className="space-y-2">
                        {quote.items.map((item) => (
                          <div key={`${item.id}-${option.id}`} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              name={`lead-time-${item.id}`}
                              value={option.id}
                              checked={leadTimeSelections[item.id] === option.id}
                              onChange={() => handleLeadTimeSelect(item.id, option.id)}
                              className="text-blue-600"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{option.speed}</span>
                                <span className="text-sm text-green-600">{option.savings_text}</span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-600">
                                <span>{option.business_days} business days</span>
                                <span>${option.unit_price.toFixed(2)}/unit</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Promo Section */}
            <Card>
              <CardHeader>
                <CardTitle>Apply Promo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                  />
                  <Button onClick={handleApplyPromo}>
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                </div>
                {appliedPromos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {appliedPromos.map((promo, index) => (
                      <Badge key={index} variant="secondary" className="mr-2">
                        {promo}
                        <button
                          onClick={() => setAppliedPromos(prev => prev.filter(p => p !== promo))}
                          className="ml-2 text-gray-500 hover:text-gray-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Subtotal Card */}
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="font-semibold">${calculateTotals().toFixed(2)}</span>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-sm text-green-600">
                    <span>Offset Carbon Emissions</span>
                    <span className="text-xs">Info</span>
                  </div>

                  <Button className="w-full" size="lg">
                    Continue to Checkout
                  </Button>

                  <Button variant="outline" className="w-full">
                    Forward to Purchaser
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
