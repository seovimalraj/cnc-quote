'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { EyeIcon, TruckIcon, ReceiptPercentIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { Order, OrderFilters, OrdersListResponse, Shipment } from '@/types/order';
import { trackEvent } from '@/lib/analytics/posthog';

const ITEMS_PER_PAGE = 20;

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'In_Production', label: 'In Production' },
  { value: 'QA_Incoming', label: 'QA Incoming' },
  { value: 'QA_Final', label: 'QA Final' },
  { value: 'Ready_To_Ship', label: 'Ready to Ship' },
  { value: 'Shipped', label: 'Shipped' },
  { value: 'Completed', label: 'Completed' },
  { value: 'On_Hold', label: 'On Hold' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'Refunded', label: 'Refunded' },
];

const VALUE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: '<1000', label: '<$1,000' },
  { value: '1000-10000', label: '$1k–$10k' },
  { value: '>10000', label: '>$10k' },
];

const SOURCE_OPTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'web', label: 'Web' },
  { value: 'widget', label: 'Widget' },
  { value: 'large_order', label: 'Large Order' },
];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filters, setFilters] = useState<OrderFilters>({});
  const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
  const [trackingShipments, setTrackingShipments] = useState<Shipment[]>([]);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load orders when filters change
  const loadOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: ITEMS_PER_PAGE.toString(),
        q: debouncedSearchQuery,
        ...(filters.status && { status: filters.status.join(',') }),
        ...(filters.date_range?.from && { date_from: filters.date_range.from }),
        ...(filters.date_range?.to && { date_to: filters.date_range.to }),
        ...(filters.value && { value_band: filters.value }),
        ...(filters.source && { source: filters.source }),
      });

      const response = await api.get<OrdersListResponse>(`/orders?${params}`);
      setOrders(response.data.orders);
      setTotal(response.data.total);

      trackEvent('orders_list_view', {
        page,
        filters: Object.keys(filters).length,
        search_query: debouncedSearchQuery || undefined,
      });
    } catch (error) {
      toast.error('Failed to load orders');
      console.error('Error loading orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearchQuery, filters]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Handle filter changes
  const handleFilterChange = (key: keyof OrderFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page
        trackEvent('orders_filter_changed', { filter: key, value });
  };

  // Handle search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  // Handle row actions
  const handleViewOrder = (orderId: string) => {
    trackEvent('orders_row_view', { order_id: orderId });
    router.push(`/portal/orders/${orderId}`);
  };

  const handleTrackOrder = async (orderId: string) => {
    setTrackingOrderId(orderId);
    setIsTrackingLoading(true);
    try {
      const response = await api.get<Shipment[]>(`/orders/${orderId}/shipments`);
      setTrackingShipments(response.data);
    } catch (error) {
      toast.error('Failed to load tracking information');
      console.error('Error loading shipments:', error);
    } finally {
      setIsTrackingLoading(false);
    }
  };

  const handleDownloadInvoice = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/invoices/latest.pdf`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      trackEvent('orders_download_invoice', { order_id: orderId });
    } catch (error) {
      toast.error('Failed to download invoice');
      console.error('Error downloading invoice:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        ...(filters.status && { status: filters.status.join(',') }),
        ...(filters.date_range?.from && { date_from: filters.date_range.from }),
        ...(filters.date_range?.to && { date_to: filters.date_range.to }),
        ...(filters.value && { value_band: filters.value }),
        ...(filters.source && { source: filters.source }),
        q: debouncedSearchQuery,
      });

      const response = await fetch(`/api/orders/export.csv?${params}`);
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'orders-export.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      trackEvent('orders_export');
    } catch (error) {
      toast.error('Failed to export orders');
      console.error('Error exporting orders:', error);
    }
  };

  const handleOpenCarrierTracking = (carrier: string, trackingNumber: string) => {
    // This would open the carrier's tracking page
    const urls: Record<string, string> = {
      UPS: `https://www.ups.com/track?tracknum=${trackingNumber}`,
      FedEx: `https://www.fedex.com/en-us/tracking.html?tracknumbers=${trackingNumber}`,
      DHL: `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`,
      USPS: `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${trackingNumber}`,
    };
    const url = urls[carrier] || `https://www.google.com/search?q=${carrier}+tracking+${trackingNumber}`;
    window.open(url, '_blank');
  };

  // Format currency
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      Pending: 'secondary',
      In_Production: 'default',
      QA_Incoming: 'default',
      QA_Final: 'default',
      Ready_To_Ship: 'default',
      Shipped: 'default',
      Completed: 'default',
      On_Hold: 'destructive',
      Cancelled: 'destructive',
      Refunded: 'outline',
    };
    return variants[status] || 'default';
  };

  // Pagination
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Orders</h1>
        <Button onClick={handleExportCSV} variant="outline">
          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Search and Filters */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Input
                placeholder="Search orders, quotes, tracking…"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="max-w-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Select
              value={filters.status?.[0] || ''}
              onValueChange={(value) => handleFilterChange('status', value ? [value] : undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DatePickerWithRange
              date={{
                from: filters.date_range?.from ? new Date(filters.date_range.from) : undefined,
                to: filters.date_range?.to ? new Date(filters.date_range.to) : undefined,
              }}
              onDateChange={(range) => handleFilterChange('date_range', {
                from: range.from?.toISOString().split('T')[0],
                to: range.to?.toISOString().split('T')[0],
              })}
              className="w-full"
            />

            <Select
              value={filters.value || ''}
              onValueChange={(value) => handleFilterChange('value', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Values" />
              </SelectTrigger>
              <SelectContent>
                {VALUE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.source || ''}
              onValueChange={(value) => handleFilterChange('source', value || undefined)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any Source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Orders Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Quote</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>ETA</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Loading orders...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex flex-col items-center space-y-2">
                    <p className="text-gray-500">No orders yet</p>
                    <p className="text-sm text-gray-400">Place your first order from a quote.</p>
                    <Button onClick={() => router.push('/portal/quotes')} variant="outline">
                      Go to Quotes
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {order.quote_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(order.status)}>
                      {order.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.eta_date ? formatDate(order.eta_date) : 'TBD'}
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(order.totals.grand_total)}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatDate(order.updated_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleViewOrder(order.id)}
                        title="View Order"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTrackOrder(order.id)}
                        title="Track Order"
                      >
                        <TruckIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadInvoice(order.id)}
                        title="Download Invoice"
                      >
                        <ReceiptIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-500">
            Showing {((page - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(page * ITEMS_PER_PAGE, total)} of {total} orders
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={!hasPrevPage}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Tracking Drawer */}
      <Dialog open={!!trackingOrderId} onOpenChange={() => setTrackingOrderId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tracking Information</DialogTitle>
          </DialogHeader>

          {isTrackingLoading ? (
            <div className="py-8 text-center">Loading tracking information...</div>
          ) : trackingShipments.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No shipments found for this order.
            </div>
          ) : (
            <div className="space-y-6">
              {trackingShipments.map((shipment) => (
                <Card key={shipment.id} className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">
                      {shipment.carrier} {shipment.service}
                    </h3>
                    <Badge variant={shipment.status === 'Delivered' ? 'default' : 'secondary'}>
                      {shipment.status.replace('_', ' ')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Tracking Numbers</p>
                      <p className="font-mono text-sm">
                        {shipment.tracking_numbers.join(', ')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Ship Date</p>
                      <p>{shipment.ship_date ? formatDate(shipment.ship_date) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Delivery Date</p>
                      <p>{shipment.delivery_date ? formatDate(shipment.delivery_date) : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Packages</p>
                      <p>{shipment.packages.length}</p>
                    </div>
                  </div>

                  {shipment.events.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-500 mb-2">Tracking Events</p>
                      <div className="space-y-2">
                        {shipment.events.slice(0, 5).map((event, index) => (
                          <div key={index} className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{event.status}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(event.ts)} • {event.location}
                              </p>
                              <p className="text-xs text-gray-600">{event.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCarrierTracking(shipment.carrier, shipment.tracking_numbers[0])}
                    >
                      Open Carrier Tracking
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
