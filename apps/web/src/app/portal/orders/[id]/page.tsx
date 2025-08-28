'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { QapDocumentsList } from './qap/page';

export default function OrderDetailsPage() {
  const params = useParams();
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, []);

  const loadOrder = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/orders/${params.id}`);
      setOrder(response.data);
    } catch (error) {
      toast.error('Failed to load order');
      console.error('Error loading order:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!order) {
    return <div>Order not found</div>;
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            Order #{order.id.slice(0, 8)}
          </h1>
          <Badge>{order.status}</Badge>
        </div>

        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => window.print()}>
            Print Order
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="qap">Quality Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <div className="grid gap-6">
            {/* Order Details */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Order Details</h2>
              <dl className="grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm text-gray-500">Total Amount</dt>
                  <dd className="text-2xl font-bold">
                    {order.currency} {order.total_amount.toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Status</dt>
                  <dd>
                    <Badge>{order.status}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500">Created</dt>
                  <dd>{new Date(order.created_at).toLocaleDateString()}</dd>
                </div>
              </dl>
            </Card>

            {/* Order Items */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Items</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Item</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-right py-2">Qty</th>
                      <th className="text-right py-2">Unit Price</th>
                      <th className="text-right py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item: any) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-2">Part #{item.id.slice(0, 8)}</td>
                        <td className="py-2">
                          <Badge variant="outline">{item.status}</Badge>
                        </td>
                        <td className="text-right py-2">{item.quantity}</td>
                        <td className="text-right py-2">
                          {order.currency} {item.unit_price.toFixed(2)}
                        </td>
                        <td className="text-right py-2">
                          {order.currency} {item.total_price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="qap">
          <QapDocumentsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
