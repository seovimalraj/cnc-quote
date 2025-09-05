import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Separator } from '../../components/ui/separator';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft,
  Edit,
  Download,
  Truck,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
  DollarSign,
  Package
} from 'lucide-react';

interface OrderDetails {
  id: string;
  order_number: string;
  status: string;
  priority: string;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  customer: {
    id: string;
    name: string;
    email: string;
    company?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    status: string;
    quote_item: {
      file: {
        name: string;
      };
      material: {
        name: string;
      };
    };
  }>;
  status_history: Array<{
    id: string;
    new_status: string;
    notes?: string;
    changed_by: string;
    created_at: string;
    user?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    payment_method?: string;
    created_at: string;
  }>;
  shipments: Array<{
    id: string;
    tracking_number?: string;
    carrier?: string;
    status: string;
    shipped_at?: string;
    delivered_at?: string;
    created_at: string;
  }>;
  work_orders: Array<{
    id: string;
    work_order_number: string;
    status: string;
    assigned_to?: string;
    priority: string;
    due_date?: string;
    created_at: string;
    assigned_user?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
  qap_documents: Array<{
    id: string;
    document_number: string;
    status: string;
    template: {
      name: string;
      version: string;
    };
    created_at: string;
  }>;
  documents: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    uploaded_by: string;
    created_at: string;
    uploader: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

export default function OrderDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id && user) {
      fetchOrderDetails();
    }
  }, [id, user]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/details/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'in_production':
        return 'bg-purple-100 text-purple-800';
      case 'quality_check':
        return 'bg-orange-100 text-orange-800';
      case 'shipping':
        return 'bg-indigo-100 text-indigo-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">{error || 'Order not found'}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/admin/orders')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {order.order_number || `Order ${order.id.slice(-8)}`}
            </h1>
            <p className="text-gray-600">
              Created {format(new Date(order.created_at), 'PPP')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(order.status)}>
            {order.status.replace('_', ' ')}
          </Badge>
          <Badge className={getPriorityColor(order.priority)}>
            {order.priority}
          </Badge>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Order Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(order.total_amount, order.currency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{order.items.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Work Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{order.work_orders.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shipments</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{order.shipments.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="work-orders">Work Orders</TabsTrigger>
          <TabsTrigger value="qap">QAP</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="shipments">Shipments</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{order.customer.name}</p>
                  <p className="text-sm text-gray-600">{order.customer.email}</p>
                  {order.customer.company && (
                    <p className="text-sm text-gray-600">{order.customer.company}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Order Number:</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Created:</span>
                  <span className="font-medium">
                    {format(new Date(order.created_at), 'PPP')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Last Updated:</span>
                  <span className="font-medium">
                    {format(new Date(order.updated_at), 'PPP')}
                  </span>
                </div>
                {order.notes && (
                  <div>
                    <span className="text-sm text-gray-600">Notes:</span>
                    <p className="mt-1 text-sm">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Payments */}
          {order.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="font-medium">
                            {formatCurrency(payment.amount, payment.currency)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {payment.payment_method} • {format(new Date(payment.created_at), 'PPP')}
                          </p>
                        </div>
                      </div>
                      <Badge className={payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.quote_item.file.name}</h4>
                      <p className="text-sm text-gray-600">
                        Material: {item.quote_item.material.name}
                      </p>
                      <p className="text-sm text-gray-600">
                        Quantity: {item.quantity} • Unit Price: {formatCurrency(item.unit_price, order.currency)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(item.total_price, order.currency)}</p>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="work-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Work Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {order.work_orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No work orders created yet</p>
              ) : (
                <div className="space-y-4">
                  {order.work_orders.map((workOrder) => (
                    <div key={workOrder.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{workOrder.work_order_number}</h4>
                        <p className="text-sm text-gray-600">
                          Assigned to: {workOrder.assigned_user?.name || 'Unassigned'}
                        </p>
                        {workOrder.due_date && (
                          <p className="text-sm text-gray-600">
                            Due: {format(new Date(workOrder.due_date), 'PPP')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge className={getPriorityColor(workOrder.priority)}>
                          {workOrder.priority}
                        </Badge>
                        <Badge className={getStatusColor(workOrder.status)} className="ml-2">
                          {workOrder.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qap" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Assurance Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {order.qap_documents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No QAP documents generated yet</p>
              ) : (
                <div className="space-y-4">
                  {order.qap_documents.map((qap) => (
                    <div key={qap.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{qap.document_number}</h4>
                        <p className="text-sm text-gray-600">
                          Template: {qap.template.name} v{qap.template.version}
                        </p>
                        <p className="text-sm text-gray-600">
                          Created: {format(new Date(qap.created_at), 'PPP')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(qap.status)}>
                        {qap.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {order.documents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No documents uploaded yet</p>
              ) : (
                <div className="space-y-4">
                  {order.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{doc.name}</h4>
                        <p className="text-sm text-gray-600">
                          Type: {doc.type} • Uploaded by: {doc.uploader.name}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(doc.created_at), 'PPP')}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shipments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shipments</CardTitle>
            </CardHeader>
            <CardContent>
              {order.shipments.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No shipments created yet</p>
              ) : (
                <div className="space-y-4">
                  {order.shipments.map((shipment) => (
                    <div key={shipment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">
                          {shipment.tracking_number || `Shipment ${shipment.id.slice(-8)}`}
                        </h4>
                        {shipment.carrier && (
                          <p className="text-sm text-gray-600">Carrier: {shipment.carrier}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          Created: {format(new Date(shipment.created_at), 'PPP')}
                        </p>
                        {shipment.shipped_at && (
                          <p className="text-sm text-gray-600">
                            Shipped: {format(new Date(shipment.shipped_at), 'PPP')}
                          </p>
                        )}
                        {shipment.delivered_at && (
                          <p className="text-sm text-gray-600">
                            Delivered: {format(new Date(shipment.delivered_at), 'PPP')}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(shipment.status)}>
                        {shipment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.status_history.map((history, index) => (
                  <div key={history.id} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-600" />
                      </div>
                      {index < order.status_history.length - 1 && (
                        <div className="w-px h-8 bg-gray-200 mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getStatusColor(history.new_status)}>
                          {history.new_status.replace('_', ' ')}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {format(new Date(history.created_at), 'PPP')}
                        </span>
                      </div>
                      {history.notes && (
                        <p className="text-sm text-gray-600 mb-1">{history.notes}</p>
                      )}
                      {history.user && (
                        <p className="text-xs text-gray-500">
                          Changed by: {history.user.name}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
