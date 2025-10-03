"use client";

import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  FileText, 
  Download, 
  Copy,
  Trash2,
  Eye,
  ArrowUpDown,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Package,
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';

interface QuoteHistoryItem {
  id: string;
  quoteNumber: string;
  partName: string;
  material: string;
  quantity: number;
  totalPrice: number;
  unitPrice: number;
  leadTimeDays: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  thumbnailUrl?: string;
  notes?: string;
}

interface QuoteHistoryProps {
  quotes?: QuoteHistoryItem[];
  onViewQuote?: (quoteId: string) => void;
  onDuplicateQuote?: (quoteId: string) => void;
  onDeleteQuote?: (quoteId: string) => void;
  onExportQuote?: (quoteId: string) => void;
}

// Mock data for demonstration
const MOCK_QUOTES: QuoteHistoryItem[] = [
  {
    id: 'q-001',
    quoteNumber: 'QT-2025-001',
    partName: 'Bracket_Assembly_v2.step',
    material: 'Aluminum 6061-T6',
    quantity: 50,
    totalPrice: 8250.00,
    unitPrice: 165.00,
    leadTimeDays: 7,
    status: 'accepted',
    createdAt: new Date('2025-09-28'),
    updatedAt: new Date('2025-09-29'),
    expiresAt: new Date('2025-10-28'),
    notes: 'Expedited delivery requested'
  },
  {
    id: 'q-002',
    quoteNumber: 'QT-2025-002',
    partName: 'Housing_Cover.stl',
    material: 'ABS Plastic',
    quantity: 100,
    totalPrice: 4200.00,
    unitPrice: 42.00,
    leadTimeDays: 5,
    status: 'sent',
    createdAt: new Date('2025-09-30'),
    updatedAt: new Date('2025-09-30'),
    expiresAt: new Date('2025-10-30'),
  },
  {
    id: 'q-003',
    quoteNumber: 'QT-2025-003',
    partName: 'Gear_Component.step',
    material: 'Stainless Steel 304',
    quantity: 10,
    totalPrice: 1850.00,
    unitPrice: 185.00,
    leadTimeDays: 10,
    status: 'draft',
    createdAt: new Date('2025-10-01'),
    updatedAt: new Date('2025-10-01'),
  },
  {
    id: 'q-004',
    quoteNumber: 'QT-2025-004',
    partName: 'Shaft_Precision.stp',
    material: 'Aluminum 7075-T6',
    quantity: 25,
    totalPrice: 3125.00,
    unitPrice: 125.00,
    leadTimeDays: 8,
    status: 'rejected',
    createdAt: new Date('2025-09-25'),
    updatedAt: new Date('2025-09-27'),
    expiresAt: new Date('2025-10-25'),
    notes: 'Customer chose alternative supplier'
  },
  {
    id: 'q-005',
    quoteNumber: 'QT-2025-005',
    partName: 'Flange_Mount.step',
    material: 'Brass C360',
    quantity: 5,
    totalPrice: 875.00,
    unitPrice: 175.00,
    leadTimeDays: 6,
    status: 'expired',
    createdAt: new Date('2025-08-15'),
    updatedAt: new Date('2025-08-15'),
    expiresAt: new Date('2025-09-15'),
  },
];

const STATUS_COLORS = {
  draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', icon: FileText },
  sent: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: Clock },
  accepted: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle2 },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle },
  expired: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: AlertCircle },
};

export function QuoteHistory({ 
  quotes = MOCK_QUOTES,
  onViewQuote,
  onDuplicateQuote,
  onDeleteQuote,
  onExportQuote
}: Readonly<QuoteHistoryProps>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort quotes
  const filteredQuotes = useMemo(() => {
    let filtered = [...quotes];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => 
        q.quoteNumber.toLowerCase().includes(query) ||
        q.partName.toLowerCase().includes(query) ||
        q.material.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(q => q.status === statusFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
      } else if (sortBy === 'price') {
        comparison = a.totalPrice - b.totalPrice;
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [quotes, searchQuery, statusFilter, sortBy, sortOrder]);

  const toggleSort = (field: 'date' | 'price' | 'status') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).format(date);
  };

  const getDaysUntilExpiry = (expiresAt?: Date) => {
    if (!expiresAt) return null;
    const now = new Date();
    const diffTime = expiresAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Calculate summary stats
  const stats = useMemo(() => {
    return {
      total: quotes.length,
      draft: quotes.filter(q => q.status === 'draft').length,
      sent: quotes.filter(q => q.status === 'sent').length,
      accepted: quotes.filter(q => q.status === 'accepted').length,
      totalValue: quotes
        .filter(q => q.status === 'accepted')
        .reduce((sum, q) => sum + q.totalPrice, 0),
    };
  }, [quotes]);

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs opacity-90">Total Quotes</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-lg text-white">
          <div className="text-2xl font-bold">{stats.accepted}</div>
          <div className="text-xs opacity-90">Accepted</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg text-white">
          <div className="text-2xl font-bold">{stats.sent}</div>
          <div className="text-xs opacity-90">Pending</div>
        </div>
        <div className="p-4 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg text-white">
          <div className="text-2xl font-bold">${(stats.totalValue / 1000).toFixed(1)}k</div>
          <div className="text-xs opacity-90">Total Value</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search quotes by number, part name, or material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Quotes Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => toggleSort('date')}
                    className="flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    <Calendar className="w-3 h-3" />
                    Date
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Quote #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Part Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Material</th>
                <th className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleSort('price')}
                    className="flex items-center gap-1 ml-auto text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    <DollarSign className="w-3 h-3" />
                    Price
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleSort('status')}
                    className="flex items-center gap-1 mx-auto text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                  >
                    Status
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">No quotes found</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {searchQuery || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first quote to get started'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => {
                  const StatusIcon = STATUS_COLORS[quote.status].icon;
                  const daysUntilExpiry = getDaysUntilExpiry(quote.expiresAt);
                  
                  return (
                    <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatDate(quote.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {quote.leadTimeDays}d lead time
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {quote.quoteNumber}
                        </div>
                        {daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                          <div className="text-xs text-orange-600 dark:text-orange-400">
                            Expires in {daysUntilExpiry}d
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                          {quote.partName}
                        </div>
                        {quote.notes && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                            {quote.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-gray-700 dark:text-gray-300">{quote.material}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          Qty: {quote.quantity}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                          ${quote.totalPrice.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ${quote.unitPrice.toFixed(2)}/unit
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[quote.status].bg} ${STATUS_COLORS[quote.status].text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewQuote?.(quote.id)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            title="View quote"
                          >
                            <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => onDuplicateQuote?.(quote.id)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Duplicate quote"
                          >
                            <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => onExportQuote?.(quote.id)}
                            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                            title="Export PDF"
                          >
                            <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => onDeleteQuote?.(quote.id)}
                            className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                            title="Delete quote"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      {filteredQuotes.length > 0 && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Showing {filteredQuotes.length} of {quotes.length} quotes
        </div>
      )}
    </div>
  );
}
