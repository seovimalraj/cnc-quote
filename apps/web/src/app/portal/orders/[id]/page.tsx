'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeftIcon,
  ReceiptPercentIcon,
  DocumentIcon,
  ArrowPathIcon,
  LifebuoyIcon,
  PaperAirplaneIcon,
  CloudArrowDownIcon,
  EyeIcon,
  TruckIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import type {
  Order,
  OrderTimelineStep,
  Shipment,
  Document,
  Invoice,
  Message
} from '@/types/order';
import { trackEvent } from '@/lib/analytics/posthog';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineStep[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [newMessage, setNewMessage] = useState('');

  const orderId = params?.id as string;

  const loadOrderData = useCallback(async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);

      // Load all order data in parallel
      const [orderRes, timelineRes, shipmentsRes, documentsRes, invoicesRes, messagesRes] = await Promise.all([
        api.get<Order>(`/orders/${orderId}`),
        api.get<OrderTimelineStep[]>(`/orders/${orderId}/timeline`),
        api.get<Shipment[]>(`/orders/${orderId}/shipments`),
        api.get<Document[]>(`/orders/${orderId}/documents`),
        api.get<Invoice[]>(`/orders/${orderId}/invoices`),
        api.get<Message[]>(`/orders/${orderId}/messages`),
      ]);

      setOrder(orderRes.data);
      setTimeline(timelineRes.data);
      setShipments(shipmentsRes.data);
      setDocuments(documentsRes.data);
      setInvoices(invoicesRes.data);
      setMessages(messagesRes.data);

      trackEvent('order_detail_view', { order_id: orderId });
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Order not found');
        router.push('/portal/orders');
      } else {
        toast.error('Failed to load order details');
        console.error('Error loading order data:', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [orderId, router]);

  useEffect(() => {
    if (orderId) {
      loadOrderData();
    }
  }, [orderId, loadOrderData]);

  // Handle actions
  const handleDownloadInvoice = async () => {
    if (!order) return;
    try {
      const response = await fetch(`/api/orders/${order.id}/invoices/latest.pdf`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      trackEvent('order_download_invoice', { order_id: order.id });
    } catch (error: any) {
      toast.error('Failed to download invoice');
      console.error('Error downloading invoice:', error);
    }
  };

  const handleViewQuote = () => {
    if (!order) return;
    posthog.capture('order_view_quote', { order_id: order.id, quote_id: order.quote_id });
    router.push(`/portal/quotes/${order.quote_id}`);
  };

  const handleReorder = async () => {
    if (!order) return;
    try {
      const response = await api.post(`/api/quotes/${order.quote_id}/duplicate`);
      const newQuoteId = response.data.id;
      posthog.capture('order_reorder', { order_id: order.id, new_quote_id: newQuoteId });
      router.push(`/portal/quotes/${newQuoteId}`);
    } catch (error: any) {
      toast.error('Failed to create reorder quote');
      console.error('Error duplicating quote:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!order || !newMessage.trim()) return;
    try {
      await api.post(`/orders/${order.id}/messages`, {
        body: newMessage.trim(),
        attachments: []
      });
      setNewMessage('');
      // Refresh messages
      const messagesRes = await api.get<Message[]>(`/orders/${order.id}/messages`);
      setMessages(messagesRes.data);
      posthog.capture('order_message_sent', { order_id: order.id });
      toast.success('Message sent');
    } catch (error: any) {
      toast.error('Failed to send message');
      console.error('Error sending message:', error);
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const response = await fetch(doc.url);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      posthog.capture('order_download_document', { order_id: order?.id, document_id: doc.id });
    } catch (error) {
      toast.error('Failed to download document');
      console.error('Error downloading document:', error);
    }
  };

  const handleDownloadAllDocuments = async () => {
    if (!order) return;
    try {
      const response = await fetch(`/api/orders/${order.id}/documents/archive.zip`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order-${order.id}-documents.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast.error('Failed to download documents');
      console.error('Error downloading documents:', error);
    }
  };

  const handleOpenTracking = (shipment: Shipment) => {
    const urls: Record<string, string> = {
      UPS: `https://www.ups.com/track?tracknum=${shipment.tracking_numbers[0]}`,
      FedEx: `https://www.fedex.com/en-us/tracking.html?tracknumbers=${shipment.tracking_numbers[0]}`,
      DHL: `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${shipment.tracking_numbers[0]}`,
      USPS: `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${shipment.tracking_numbers[0]}`,
    };
    const url = urls[shipment.carrier] || `https://www.google.com/search?q=${shipment.carrier}+tracking+${shipment.tracking_numbers[0]}`;
    window.open(url, '_blank');
    posthog.capture('order_open_tracking', { order_id: order?.id, shipment_id: shipment.id });
  };

  const handleDownloadPackingList = async (shipment: Shipment) => {
    try {
      const response = await fetch(`/api/orders/${order?.id}/shipments/${shipment.id}/packing-list.pdf`);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `packing-list-${shipment.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast.error('Failed to download packing list');
      console.error('Error downloading packing list:', error);
    }
  };

  // Helper functions
  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  const getDocumentIcon = (kind: string) => {
    const icons: Record<string, any> = {
      QAP: DocumentTextIcon,
      CoC: DocumentTextIcon,
      Material_Cert: DocumentTextIcon,
      FAIR: DocumentTextIcon,
      Dimensional_Report: DocumentTextIcon,
      Quote_PDF: FileIcon,
      Invoice_PDF: ReceiptIcon,
      Packing_List: DocumentTextIcon,
      Shipping_Label: TruckIcon,
    };
    return icons[kind] || FileIcon;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm">
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-8">
        <div className="flex items-center space-x-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/portal/orders')}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
        </div>
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">The order you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => router.push('/portal/orders')}>
            Go to Orders
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/portal/orders')}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Order {order.id.slice(0, 8)}</h1>
            <Badge variant={getStatusVariant(order.status)} className="mt-1">
              {order.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleDownloadInvoice}>
            <ReceiptIcon className="w-4 h-4 mr-2" />
            Download Invoice
          </Button>
          <Button variant="outline" onClick={handleViewQuote}>
            <FileIcon className="w-4 h-4 mr-2" />
            View Quote
          </Button>
          <Button variant="outline" onClick={handleReorder}>
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Reorder
          </Button>
          <Button variant="outline" onClick={() => setActiveTab('messages')}>
            <LifebuoyIcon className="w-4 h-4 mr-2" />
            Contact Support
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="shipments">Shipments</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="messages">Messages</TabsTrigger>
            </TabsList>

            {/* Production Timeline */}
            <TabsContent value="timeline" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Production Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {timeline.map((step, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className={`w-3 h-3 rounded-full mt-2 ${
                          step.ts ? 'bg-green-500' : 'bg-gray-300'
                        }`}></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{step.name}</h4>
                            {step.ts && (
                              <span className="text-sm text-gray-500">
                                {formatDate(step.ts)}
                              </span>
                            )}
                          </div>
                          {step.actor && (
                            <p className="text-sm text-gray-600">by {step.actor}</p>
                          )}
                          {step.note && (
                            <p className="text-sm text-gray-600 mt-1">{step.note}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shipments & Tracking */}
            <TabsContent value="shipments" className="space-y-4">
              {shipments.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-500">
                    No shipments yet
                  </CardContent>
                </Card>
              ) : (
                shipments.map((shipment) => (
                  <Card key={shipment.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          {shipment.carrier} {shipment.service}
                        </CardTitle>
                        <Badge variant={shipment.status === 'Delivered' ? 'default' : 'secondary'}>
                          {shipment.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
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
                            {shipment.events.map((event, index) => (
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

                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenTracking(shipment)}
                        >
                          Track on Carrier
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownloadPackingList(shipment)}
                        >
                          Packing List
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Documents */}
            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Documents</CardTitle>
                    {documents.length > 1 && (
                      <Button variant="outline" size="sm" onClick={handleDownloadAllDocuments}>
                        <CloudArrowDownIcon className="w-4 h-4 mr-2" />
                        Download All
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No documents available</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map((doc) => {
                          const IconComponent = getDocumentIcon(doc.kind);
                          return (
                            <TableRow key={doc.id}>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <IconComponent className="w-4 h-4" />
                                  <span className="text-sm">{doc.kind.replace('_', ' ')}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-medium">{doc.name}</TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {formatDate(doc.created_at)}
                              </TableCell>
                              <TableCell className="text-sm text-gray-500">
                                {formatFileSize(doc.size_bytes)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDownloadDocument(doc)}
                                  >
                                    <CloudArrowDownIcon className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(`/viewer/pdf/${doc.id}`, '_blank')}
                                  >
                                    <EyeIcon className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Invoices */}
            <TabsContent value="invoices">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices & Receipts</CardTitle>
                </CardHeader>
                <CardContent>
                  {invoices.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No invoices available</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow key={invoice.id}>
                            <TableCell className="font-mono">{invoice.number}</TableCell>
                            <TableCell>
                              <Badge variant={invoice.status === 'Paid' ? 'default' : 'secondary'}>
                                {invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                            <TableCell className="text-sm text-gray-500">
                              {formatDate(invoice.created_at)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(invoice.url, '_blank')}
                              >
                                <CloudArrowDownIcon className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Messages */}
            <TabsContent value="messages">
              <Card>
                <CardHeader>
                  <CardTitle>Messages & Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Messages Thread */}
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No messages yet</p>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className={`flex ${message.role === 'buyer' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-md p-3 rounded-lg ${
                            message.role === 'buyer'
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium">{message.author}</span>
                              <span className="text-xs opacity-75">
                                {formatDate(message.created_at)}
                              </span>
                            </div>
                            <p className="text-sm">{message.body}</p>
                            {message.attachments.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {message.attachments.map((attachment) => (
                                  <Button
                                    key={attachment.id}
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 h-auto text-xs"
                                    onClick={() => handleDownloadDocument(attachment)}
                                  >
                                    <CloudArrowDownIcon className="w-3 h-3 mr-1" />
                                    {attachment.name}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Separator />

                  {/* Message Composer */}
                  <div className="space-y-3">
                    <Input
                      placeholder="Write a message to support…"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                        <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Order ID:</span>
                <span className="font-mono text-sm">{order.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Placed:</span>
                <span className="text-sm">{formatDate(order.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">ETA:</span>
                <span className="text-sm">
                  {order.eta_date ? formatDate(order.eta_date) : 'TBD'}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(order.totals.grand_total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Addresses */}
          <Card>
            <CardHeader>
              <CardTitle>Addresses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Billing</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{order.addresses.billing.name}</p>
                  <p>{order.addresses.billing.line1}</p>
                  <p>
                    {order.addresses.billing.city}, {order.addresses.billing.state} {order.addresses.billing.zip}
                  </p>
                  <p>{order.addresses.billing.country}</p>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Shipping</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>{order.addresses.shipping.name}</p>
                  <p>{order.addresses.shipping.line1}</p>
                  <p>
                    {order.addresses.shipping.city}, {order.addresses.shipping.state} {order.addresses.shipping.zip}
                  </p>
                  <p>{order.addresses.shipping.country}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Method */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Method:</span>
                <span className="text-sm">{order.shipping_method || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Incoterms:</span>
                <span className="text-sm">{order.incoterms || 'N/A'}</span>
              </div>
              <div className="mt-3">
                <Button variant="link" className="p-0 h-auto text-sm">
                  Shipping & Lead Times Help
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
