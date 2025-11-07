'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, Package, Clock, Mail, FileText, 
  ArrowRight, TrendingUp, Users, Loader2
} from 'lucide-react';
import { getOrder } from '@/lib/database';

export default function OrderConfirmationPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.orderId as string;

  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrder() {
      try {
        setLoading(true);
        const order = await getOrder(orderId);
        
        if (!order) {
          setError('Order not found');
          return;
        }

        // Transform database order to match UI expectations
        setOrderData({
          orderId: order.id,
          rfqId: `RFQ-${order.id.split('-')[2]}`, // Derive RFQ ID from order ID
          customer: {
            email: order.customer_email,
            companyName: order.customer_company || 'N/A',
            contactName: order.customer_name || 'Valued Customer'
          },
          parts: order.parts.map((p: any) => ({
            fileName: p.file_name,
            quantity: p.quantity,
            material: p.material
          })),
          totalPrice: order.total_price,
          leadTime: 7, // Default lead time
          status: order.status
        });
      } catch (err) {
        console.error('Error loading order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    }

    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error || 'Order not found'}</p>
            <Button onClick={() => router.push('/portal/orders')}>
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + orderData.leadTime);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-indigo-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-lg text-gray-600">
            Thank you for your order, {orderData.customer.contactName}
          </p>
        </div>

        {/* Order Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Order Details</CardTitle>
              <Badge className="bg-blue-100 text-blue-700 border-0">
                Order #{orderData.orderId}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* What Happens Next */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                What Happens Next
              </h3>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium text-blue-900">RFQ Sent to Manufacturers</p>
                    <p className="text-sm text-blue-800">Your project has been sent to our network of verified suppliers for competitive bidding.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium text-blue-900">Suppliers Submit Bids</p>
                    <p className="text-sm text-blue-800">Multiple manufacturers will review your requirements and submit their best quotes.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium text-blue-900">Best Supplier Selected</p>
                    <p className="text-sm text-blue-800">Our team reviews all bids and selects the best supplier based on quality, price, and delivery time.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">4</div>
                  <div>
                    <p className="font-medium text-blue-900">Production Begins</p>
                    <p className="text-sm text-blue-800">The selected supplier starts manufacturing your parts with real-time progress updates.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm flex-shrink-0">5</div>
                  <div>
                    <p className="font-medium text-blue-900">Parts Delivered</p>
                    <p className="text-sm text-blue-800">Your completed parts are inspected, packaged, and shipped to your location.</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Key Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Parts</p>
                  <p className="font-semibold text-gray-900">{orderData.parts.length} unique parts</p>
                  <p className="text-sm text-gray-500">
                    {orderData.parts.reduce((sum: number, p: any) => sum + p.quantity, 0)} total units
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Estimated Delivery</p>
                  <p className="font-semibold text-gray-900">
                    {deliveryDate.toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-gray-500">{orderData.leadTime} business days</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Confirmation Sent To</p>
                  <p className="font-semibold text-gray-900">{orderData.customer.email}</p>
                  <p className="text-sm text-gray-500">Check your inbox</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">RFQ Status</p>
                  <p className="font-semibold text-gray-900">Sent to Suppliers</p>
                  <p className="text-sm text-gray-500">RFQ #{orderData.rfqId}</p>
                </div>
              </div>
            </div>

            {/* Parts Summary */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Parts Summary</h3>
              <div className="space-y-2">
                {orderData.parts.map((part: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{part.fileName}</p>
                        <p className="text-sm text-gray-600">{part.material} • Qty: {part.quantity}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => router.push('/portal/orders')}
            className="flex items-center gap-2"
          >
            <Package className="w-5 h-5" />
            View Order Status
          </Button>
          <Button
            size="lg"
            onClick={() => router.push('/instant-quote-v2')}
            className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            Start New Quote
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Help Section */}
        <Card className="mt-6 border-2 border-blue-100">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Our team is here to assist you with any questions about your order or the manufacturing process.
            </p>
            <div className="flex flex-wrap gap-4">
              <a href="mailto:support@frigate.ai" className="text-sm text-blue-600 hover:underline">
                Email Support
              </a>
              <a href="tel:+15551234567" className="text-sm text-blue-600 hover:underline">
                Call Us: +1 (555) 123-4567
              </a>
              <a href="#" className="text-sm text-blue-600 hover:underline">
                Live Chat
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
