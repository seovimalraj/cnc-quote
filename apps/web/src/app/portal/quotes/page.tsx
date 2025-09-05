'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  DocumentTextIcon,
  CubeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { posthog } from 'posthog-js';
import { formatDate } from '@/lib/utils';

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

interface Filters {
  query: string;
  status: string;
  speed: string;
  source: string;
  dateRange: { from: Date | undefined; to: Date | undefined };
}

export default function QuotesListPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({
    query: '',
    status: 'Any',
    speed: 'Any',
    source: 'Any',
    dateRange: { from: undefined, to: undefined },
  });

  // Mock data for development
  const mockQuotes: Quote[] = [
    {
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
          ],
          unit_price: 45.50,
          total_price: 2275.00,
        },
      ],
      selected_lead_option_ids: { 'line-1': 'lead-1' },
      subtotal: 2275.00,
      promo_code: null,
      created_at: '2024-09-10T10:00:00Z',
      updated_at: '2024-09-12T14:30:00Z',
    },
    {
      id: 'Q-2024-002',
      organization_id: 'org-123',
      status: 'Draft',
      source: 'widget',
      currency: 'USD',
      lines: [
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
          lead_time_options: [],
          unit_price: 0,
          total_price: 0,
        },
      ],
      selected_lead_option_ids: {},
      subtotal: 0,
      promo_code: null,
      created_at: '2024-09-08T09:15:00Z',
      updated_at: '2024-09-08T09:15:00Z',
    },
  ];

  useEffect(() => {
    // Track page view
    posthog.capture('quotes_list_view');

    // Simulate API call
    const fetchQuotes = async () => {
      setLoading(true);
      // In real implementation: await fetch('/api/quotes', { ... })
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQuotes(mockQuotes);
      setLoading(false);
    };

    fetchQuotes();
  }, []);

  const filteredQuotes = useMemo(() => {
    return quotes.filter(quote => {
      // Search query filter
      if (filters.query && !quote.id.toLowerCase().includes(filters.query.toLowerCase()) &&
          !quote.lines.some(line => line.file_name.toLowerCase().includes(filters.query.toLowerCase()))) {
        return false;
      }

      // Status filter
      if (filters.status !== 'Any' && quote.status !== filters.status) {
        return false;
      }

      // Source filter
      if (filters.source !== 'Any' && quote.source !== filters.source.toLowerCase().replace(' ', '_')) {
        return false;
      }

      // Speed filter (based on selected lead options)
      if (filters.speed !== 'Any') {
        const hasMatchingSpeed = Object.values(quote.selected_lead_option_ids).some(leadId => {
          const line = quote.lines.find(l => l.lead_time_options.some(opt => opt.id === leadId));
          const option = line?.lead_time_options.find(opt => opt.id === leadId);
          return option?.speed.toLowerCase() === filters.speed.toLowerCase();
        });
        if (!hasMatchingSpeed) return false;
      }

      // Date range filter
      if (filters.dateRange.from || filters.dateRange.to) {
        const quoteDate = new Date(quote.created_at);
        if (filters.dateRange.from && quoteDate < filters.dateRange.from) return false;
        if (filters.dateRange.to && quoteDate > filters.dateRange.to) return false;
      }

      return true;
    });
  }, [quotes, filters]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Priced': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Expired': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Accepted': return <CheckCircleIcon className="w-4 h-4" />;
      case 'Priced': return <ClockIcon className="w-4 h-4" />;
      case 'Draft': return <DocumentTextIcon className="w-4 h-4" />;
      case 'Expired': return <XCircleIcon className="w-4 h-4" />;
      default: return <ExclamationTriangleIcon className="w-4 h-4" />;
    }
  };

  const handleExportCSV = async () => {
    posthog.capture('quotes_list_export');
    // In real implementation: await fetch('/api/quotes/export', { ... })
    console.log('Exporting CSV...');
  };

  const handleOpenQuote = (quoteId: string) => {
    router.push(`/portal/quotes/${quoteId}`);
  };

  const handleDownloadPDF = async (quoteId: string) => {
    // In real implementation: await fetch(`/api/quotes/${quoteId}/pdf`, { method: 'POST' })
    console.log(`Downloading PDF for ${quoteId}`);
  };

  const getSelectedLeadTime = (quote: Quote) => {
    if (Object.keys(quote.selected_lead_option_ids).length === 0) return 'Not selected';

    const leadIds = Object.values(quote.selected_lead_option_ids);
    const firstLeadId = leadIds[0];
    const line = quote.lines.find(l => l.lead_time_options.some(opt => opt.id === firstLeadId));
    const option = line?.lead_time_options.find(opt => opt.id === firstLeadId);

    if (!option) return 'Not selected';

    return `${option.speed} (${option.business_days} days)`;
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="flex items-center space-x-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Export CSV</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FunnelIcon className="w-5 h-5" />
              <span>Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Search */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search quotes by ID, part, material..."
                  value={filters.query}
                  onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Priced">Priced</SelectItem>
                  <SelectItem value="Needs_Review">Needs Review</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Abandoned">Abandoned</SelectItem>
                </SelectContent>
              </Select>

              {/* Speed Filter */}
              <Select
                value={filters.speed}
                onValueChange={(value) => setFilters(prev => ({ ...prev, speed: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Lead Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any Speed</SelectItem>
                  <SelectItem value="Economy">Economy</SelectItem>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Expedite">Expedite</SelectItem>
                </SelectContent>
              </Select>

              {/* Source Filter */}
              <Select
                value={filters.source}
                onValueChange={(value) => setFilters(prev => ({ ...prev, source: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Any">Any Source</SelectItem>
                  <SelectItem value="Web">Web</SelectItem>
                  <SelectItem value="Widget">Widget</SelectItem>
                  <SelectItem value="Large Order">Large Order</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <DatePickerWithRange
                date={filters.dateRange}
                onDateChange={(dateRange) => setFilters(prev => ({ ...prev, dateRange }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quotes Table */}
        <Card>
          <CardHeader>
            <CardTitle>Quotes ({filteredQuotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="w-16 h-4" />
                    <Skeleton className="w-24 h-4" />
                    <Skeleton className="w-20 h-4" />
                    <Skeleton className="w-16 h-4" />
                    <Skeleton className="w-12 h-4" />
                  </div>
                ))}
              </div>
            ) : filteredQuotes.length === 0 ? (
              <div className="text-center py-12">
                <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes yet</h3>
                <p className="text-gray-500 mb-4">
                  Drag & drop a CAD file on the Dashboard to start an instant quote.
                </p>
                <Button onClick={() => router.push('/portal/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote ID</TableHead>
                    <TableHead>Parts</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <CubeIcon className="w-4 h-4 text-gray-400" />
                          <span>{quote.lines.length} part{quote.lines.length !== 1 ? 's' : ''}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getSelectedLeadTime(quote)}</TableCell>
                      <TableCell>{formatCurrency(quote.subtotal, quote.currency)}</TableCell>
                      <TableCell>
                        <Badge className={`flex items-center space-x-1 ${getStatusColor(quote.status)}`}>
                          {getStatusIcon(quote.status)}
                          <span>{quote.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(quote.updated_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenQuote(quote.id)}
                            className="flex items-center space-x-1"
                          >
                            <EyeIcon className="w-4 h-4" />
                            <span>Open</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadPDF(quote.id)}
                            className="flex items-center space-x-1"
                          >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>PDF</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
