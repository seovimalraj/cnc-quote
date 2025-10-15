'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ContractsVNext } from '@cnc-quote/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CubeIcon,
  DocumentIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CogIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import Model3DViewer from '@/components/Model3DViewer';
import InlinePartConfiguration from '@/components/InlinePartConfiguration';

type QuoteSummaryVNext = ContractsVNext.QuoteSummaryVNext;
type QuoteLineVNext = ContractsVNext.QuoteLineVNext;
type LeadTimeOptionId = 'standard' | 'expedited';

type DisplayStatus = 'Analyzing' | 'Priced' | 'Needs_Review' | 'Error';

interface LeadOptionDisplay {
  id: LeadTimeOptionId;
  label: string;
  businessDays: number;
  unitPrice?: number | null;
  note?: string;
}

const getSelectedQuantity = (line: QuoteLineVNext): number => {
  const { selectedQuantity, quantities } = line.selection;
  if (typeof selectedQuantity === 'number') {
    return selectedQuantity;
  }
  if (Array.isArray(quantities) && quantities.length > 0) {
    return quantities[0] ?? 1;
  }
  return 1;
};

const deriveLineStatus = (line: QuoteLineVNext): DisplayStatus => {
  const pricingStatus = line.pricing.status ?? 'pending';
  switch (pricingStatus) {
    case 'ready':
      return 'Priced';
    case 'review_required':
      return 'Needs_Review';
    case 'failed':
      return 'Error';
    default: {
      const dfmStatus = line.dfm?.status ?? 'pending';
      if (dfmStatus === 'failed') {
        return 'Needs_Review';
      }
      return 'Analyzing';
    }
  }
};

const defaultLeadOptions: LeadOptionDisplay[] = [
  { id: 'expedited', label: 'Expedited', businessDays: 5 },
  { id: 'standard', label: 'Standard', businessDays: 10 },
];

const buildLeadOptions = (line: QuoteLineVNext): LeadOptionDisplay[] => {
  const matrix = Array.isArray(line.pricing.matrix) ? line.pricing.matrix : [];
  if (matrix.length === 0) {
    return defaultLeadOptions;
  }

  const entries = [...matrix].sort((a, b) => {
    const aDays = a.leadTimeDays ?? Number.POSITIVE_INFINITY;
    const bDays = b.leadTimeDays ?? Number.POSITIVE_INFINITY;
    return aDays - bDays;
  });

  const fastest = entries[0] ?? matrix[0];
  const slowest = entries[entries.length - 1] ?? matrix[matrix.length - 1];

  const fastDays = typeof fastest.leadTimeDays === 'number' ? fastest.leadTimeDays : undefined;
  const slowDays = typeof slowest.leadTimeDays === 'number' ? slowest.leadTimeDays : undefined;

  const expediteDays = fastDays ?? slowDays ?? 5;
  const standardDays = slowDays ?? fastDays ?? 10;

  const fastUnitPrice = typeof fastest.unitPrice === 'number' ? fastest.unitPrice : undefined;
  const fastTotalPrice = typeof fastest.totalPrice === 'number' ? fastest.totalPrice : undefined;
  const slowUnitPrice = typeof slowest.unitPrice === 'number' ? slowest.unitPrice : undefined;
  const slowTotalPrice = typeof slowest.totalPrice === 'number' ? slowest.totalPrice : undefined;

  const leadTimeDelta = fastDays !== undefined && slowDays !== undefined
    ? Math.max(0, slowDays - fastDays)
    : null;

  const expedite: LeadOptionDisplay = {
    id: 'expedited',
    label: 'Expedited',
    businessDays: expediteDays,
    unitPrice: fastUnitPrice ?? fastTotalPrice ?? null,
    note: leadTimeDelta && leadTimeDelta > 0 ? `Saves ${leadTimeDelta} days` : undefined,
  };

  const standard: LeadOptionDisplay = {
    id: 'standard',
    label: 'Standard',
    businessDays: standardDays,
    unitPrice: slowUnitPrice ?? slowTotalPrice ?? null,
  };

  return [expedite, standard];
};

const getLineDisplayName = (line: QuoteLineVNext, index: number): string => {
  if (line.fileId) {
    return line.fileId;
  }
  return `Part ${index + 1}`;
};

const resolveSelectedLineId = (lines: QuoteLineVNext[], previous: string | null): string | null => {
  if (previous && lines.some((line) => line.id === previous)) {
    return previous;
  }
  return lines[0]?.id ?? null;
};

const mapIssueSeverityToStatus = (severity?: 'info' | 'warn' | 'critical'): DFMCheck['status'] => {
  switch (severity) {
    case 'critical':
      return 'blocker';
    case 'warn':
      return 'warning';
    case 'info':
      return 'pass';
    default:
      return 'warning';
  }
};

const severityToLevel = (status: DFMCheck['status']): DFMCheck['severity'] => {
  switch (status) {
    case 'blocker':
      return 'high';
    case 'warning':
      return 'medium';
    default:
      return 'low';
  }
};

const deriveDfmChecks = (quote: QuoteSummaryVNext | null): DFMCheck[] => {
  if (!quote) {
    return [];
  }

  const checks: DFMCheck[] = [];

  quote.lines.forEach((line, index) => {
    const issues = line.dfm?.issues ?? [];

    if (issues.length === 0) {
      let status: DFMCheck['status'] = 'pass';
      if (line.dfm?.status === 'failed') {
        status = 'blocker';
      } else if (line.dfm?.status === 'processing' || line.dfm?.status === 'pending') {
        status = 'warning';
      }

      checks.push({
        id: `${line.id}-dfm-summary`,
        lineId: line.id,
        name: getLineDisplayName(line, index),
        status,
        message:
          status === 'pass'
            ? 'No DFM issues detected for this part.'
            : 'DFM analysis in progress.',
        severity: severityToLevel(status),
      });
      return;
    }

    issues.forEach((issue, issueIndex) => {
      const status = mapIssueSeverityToStatus(issue.severity);
      checks.push({
        id: `${line.id}-${issue.id ?? issueIndex}`,
        lineId: line.id,
        name: issue.category ?? getLineDisplayName(line, index),
        status,
        message: issue.message,
        severity: severityToLevel(status),
      });
    });
  });

  return checks;
};

const formatCurrency = (value: number | null | undefined, currency = 'USD'): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    console.warn('Failed to format currency', error);
    return `$${value.toFixed(2)}`;
  }
};

interface DFMCheck {
  id: string;
  name: string;
  status: 'pass' | 'warning' | 'blocker';
  message: string;
  severity: 'low' | 'medium' | 'high';
  lineId: string;
}

interface LeadTimeCardProps {
  selectedLine: QuoteLineVNext | null;
  leadOptions: LeadOptionDisplay[];
  currentLeadOption: string | null;
  displayCurrency: string;
  leadSelectionDisabled: boolean;
  onSelect(optionId: LeadOptionDisplay['id']): void;
}

const LeadTimeCard = ({
  selectedLine,
  leadOptions,
  currentLeadOption,
  displayCurrency,
  leadSelectionDisabled,
  onSelect,
}: LeadTimeCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center">
        <ClockIcon className="w-5 h-5 mr-2" />
        Lead Time
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      {!selectedLine ? (
        <p className="text-sm text-gray-600">Select a part to view lead time options.</p>
      ) : (
        <div className="space-y-2">
          {leadOptions.map((option) => {
            const isSelected = currentLeadOption === option.id;
            const baseClasses = isSelected
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300';
            const disabledClasses = leadSelectionDisabled ? 'opacity-60 cursor-not-allowed' : '';

            return (
              <button
                key={option.id}
                type="button"
                className={`p-3 rounded-lg border cursor-pointer transition-colors text-left w-full ${baseClasses} ${disabledClasses}`}
                onClick={() => onSelect(option.id)}
                disabled={leadSelectionDisabled}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-gray-600">{option.businessDays} business days</p>
                    {option.note && <p className="text-xs text-green-600 mt-1">{option.note}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(option.unitPrice, displayCurrency)}</p>
                    <p className="text-xs text-gray-500">per part</p>
                  </div>
                </div>
              </button>
            );
          })}
          {leadSelectionDisabled && (
            <p className="text-xs text-gray-500">
              Lead options become available once pricing completes.
            </p>
          )}
        </div>
      )}
    </CardContent>
  </Card>
);

export default function QuotePage() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawQuoteId = params?.id;
  const quoteId = Array.isArray(rawQuoteId) ? rawQuoteId[0] : rawQuoteId;

  const [quote, setQuote] = useState<QuoteSummaryVNext | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const dfmChecks = useMemo(() => deriveDfmChecks(quote), [quote]);

  const loadQuote = useCallback(async () => {
    if (!quoteId) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}?view=vnext`);

      if (!response.ok) {
        if (response.status === 404) {
          setError('Quote not found');
        } else if (response.status === 403) {
          setError('Access denied. Please complete the lead form first.');
        } else {
          setError('Failed to load quote');
        }
        setQuote(null);
        return;
      }

      const payload = await response.json();

      try {
        const parsed = ContractsVNext.QuoteSummarySchema.parse(payload);
        setQuote(parsed);
        setSelectedLineId((previous) => resolveSelectedLineId(parsed.lines, previous));
      } catch (parseError) {
        console.error('Failed to parse quote payload:', parseError);
        setError('Received malformed quote data');
        setQuote(null);
      }
    } catch (err) {
      console.error('Failed to load quote:', err);
      setError('Network error. Please try again.');
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  }, [quoteId]);

  const fromParam = searchParams?.get('from') ?? null;
  const preparingParam = searchParams?.get('preparing') ?? null;

  useEffect(() => {
    if (!quoteId) {
      setIsLoading(false);
      setError('Quote not found');
      return;
    }

    if (fromParam === 'dfm' && preparingParam === 'true') {
      setIsPreparing(true);
      setIsLoading(false);

      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}?view=vnext`);
          if (!response.ok) {
            return;
          }

          const payload = await response.json();
          const parsed = ContractsVNext.QuoteSummarySchema.parse(payload);
          setQuote(parsed);
          setSelectedLineId((previous) => resolveSelectedLineId(parsed.lines, previous));

          const allPriced = parsed.lines.every((line) => {
            const status = deriveLineStatus(line);
            return status === 'Priced' || status === 'Needs_Review';
          });

          if (allPriced) {
            setIsPreparing(false);
            clearInterval(pollInterval);
          }
        } catch (pollError) {
          console.error('Error polling quote status:', pollError);
        }
      }, 2000);

      const timeoutHandle = setTimeout(() => {
        clearInterval(pollInterval);
        setIsPreparing(false);
      }, 30000);

      return () => {
        clearInterval(pollInterval);
        clearTimeout(timeoutHandle);
      };
    }

    setIsPreparing(false);
    void loadQuote();
  }, [quoteId, fromParam, preparingParam, loadQuote]);

  const handleLeadTimeSelect = async (leadOptionId: LeadTimeOptionId) => {
    if (!quoteId || !selectedLineId) {
      return;
    }

    try {
      const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}/lead`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_option_id: leadOptionId,
          line_id: selectedLineId,
        }),
      });

      if (!response.ok) {
        console.error('Failed to update lead time:', response.statusText);
        return;
      }

      const payload = await response.json();
      const parsed = ContractsVNext.QuoteSummarySchema.parse(payload);
      setQuote(parsed);
      setSelectedLineId((previous) => resolveSelectedLineId(parsed.lines, previous));
    } catch (error) {
      console.error('Failed to update lead time:', error);
    }
  };

  const handleCheckout = async () => {
    if (!quoteId) {
      return;
    }

    try {
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_id: quoteId,
          currency: quote?.totals.currency ?? 'USD',
        }),
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  };

  const getStatusIcon = (status: DisplayStatus) => {
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

  const getStatusBadge = (status: DisplayStatus) => {
    switch (status) {
      case 'Analyzing':
        return <Badge variant="secondary">Analyzing...</Badge>;
      case 'Priced':
        return <Badge variant="success">Priced</Badge>;
      case 'Needs_Review':
        return <Badge variant="warning">Needs Review</Badge>;
      case 'Error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const hasDfmBlockers = dfmChecks.some((check) => check.status === 'blocker');
  const pricingReady = quote?.lines.every((line) => {
    const status = deriveLineStatus(line);
    return status === 'Priced' || status === 'Needs_Review';
  }) ?? false;
  const allLeadSelections = quote?.lines.every((line) => Boolean(line.selection.leadTimeOption)) ?? false;
  const canCheckout = Boolean(pricingReady && allLeadSelections && !hasDfmBlockers);
  const checkoutLabel = (() => {
    if (!pricingReady) {
      return 'Pricing in Progress';
    }
    if (!allLeadSelections) {
      return 'Select Lead Time';
    }
    if (hasDfmBlockers) {
      return 'Resolve DFM Issues';
    }
    return 'Continue to Checkout';
  })();

  const selectedLine = useMemo(() => {
    if (!quote || quote.lines.length === 0) {
      return null;
    }
    if (selectedLineId) {
      const existing = quote.lines.find((line) => line.id === selectedLineId);
      if (existing) {
        return existing;
      }
    }
    return quote.lines[0];
  }, [quote, selectedLineId]);

  const selectedLineIndex = useMemo(() => {
    if (!quote || !selectedLine) {
      return -1;
    }
    return quote.lines.findIndex((line) => line.id === selectedLine.id);
  }, [quote, selectedLine]);

  const selectedLineName = useMemo(() => {
    if (!selectedLine) {
      return undefined;
    }
    const index = selectedLineIndex >= 0 ? selectedLineIndex : 0;
    return getLineDisplayName(selectedLine, index);
  }, [selectedLine, selectedLineIndex]);

  const leadOptions = useMemo(
    () => (selectedLine ? buildLeadOptions(selectedLine) : defaultLeadOptions),
    [selectedLine],
  );

  const currentLeadOption = selectedLine?.selection.leadTimeOption ?? null;
  const displayCurrency = selectedLine?.pricing.currency ?? quote?.totals.currency ?? 'USD';
  const subtotalDisplay = formatCurrency(quote?.totals.subtotal, quote?.totals.currency ?? 'USD');
  const leadSelectionDisabled = selectedLine ? deriveLineStatus(selectedLine) === 'Analyzing' : true;

  const getDfmHighlightStatus = (status: DFMCheck['status']) => {
    switch (status) {
      case 'pass': return 'passed';
      case 'warning': return 'warning';
      case 'blocker': return 'blocker';
      default: return 'blocker';
    }
  };

  const getDfmCardClassName = (status: DFMCheck['status']) => {
    switch (status) {
      case 'blocker': return 'border-red-200 bg-red-50';
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'pass': return 'border-green-200 bg-green-50';
      default: return 'border-green-200 bg-green-50';
    }
  };

  const getDfmBadgeVariant = (status: DFMCheck['status']) => {
    switch (status) {
      case 'pass': return 'default';
      case 'warning': return 'secondary';
      case 'blocker': return 'destructive';
      default: return 'default';
    }
  };

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

  if (!quote) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Parts ({quote.lines.length})
                  <Button size="sm" variant="outline">
                    <DocumentIcon className="w-4 h-4 mr-2" />
                    Add Parts
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quote.lines.map((line, index) => {
                  const isSelected = selectedLine?.id === line.id;
                  const status = deriveLineStatus(line);
                  const partName = getLineDisplayName(line, index);
                  const quantity = getSelectedQuantity(line);
                  const processLabel = line.selection.processType ?? 'Process TBD';

                  return (
                    <button
                      key={line.id}
                      type="button"
                      className={`p-3 rounded-lg border cursor-pointer transition-colors text-left w-full ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedLineId(line.id)}
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{partName}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm text-gray-600">Qty: {quantity}</span>
                            {getStatusBadge(status)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-gray-600">{processLabel}</span>
                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation();
                              router.push(`/quote/${quote.id}/configure/${line.id}`);
                            }}
                          >
                            <CogIcon className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>3D Viewer &amp; DFM Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="viewer" className="h-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="viewer">3D Viewer</TabsTrigger>
                    <TabsTrigger value="dfm">DFM Checks ({dfmChecks.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="viewer" className="mt-4">
                    <div className="h-96">
                      {selectedLine ? (
                        <Model3DViewer
                          fileName={selectedLineName}
                          fileType="CAD Model"
                          dfmHighlights={dfmChecks
                            .filter((check) => check.lineId === selectedLine.id)
                            .map((check) => ({
                              id: check.id,
                              title: check.name,
                              status: getDfmHighlightStatus(check.status),
                              highlights: { face_ids: [], edge_ids: [] },
                              suggestions: [check.message],
                            }))}
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
                      {dfmChecks.length === 0 ? (
                        <div className="p-4 border border-gray-200 rounded-lg bg-white text-sm text-gray-600">
                          DFM analysis results will appear here once available.
                        </div>
                      ) : (
                        dfmChecks.map((check) => (
                          <div
                            key={check.id}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${getDfmCardClassName(check.status)}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                {check.status === 'pass' && <CheckCircleIcon className="w-4 h-4 text-green-500" />}
                                {check.status === 'warning' && <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />}
                                {check.status === 'blocker' && <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />}
                                <span className="font-medium">{check.name}</span>
                              </div>
                              <Badge variant={getDfmBadgeVariant(check.status)}>
                                {check.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{check.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <div className="sticky top-8 space-y-6">
              <LeadTimeCard
                selectedLine={selectedLine}
                leadOptions={leadOptions}
                currentLeadOption={currentLeadOption}
                displayCurrency={displayCurrency}
                leadSelectionDisabled={leadSelectionDisabled}
                onSelect={handleLeadTimeSelect}
              />

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
                    <span className="text-2xl font-bold">{subtotalDisplay}</span>
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
                    {checkoutLabel}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    Prices include all applicable taxes and fees
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {selectedLine && (
          <InlinePartConfiguration
            quoteId={quoteId ?? quote.id}
            lineId={selectedLine.id}
            onSpecsChange={() => {
              void loadQuote();
            }}
          />
        )}
      </div>
    </div>
  );
}
