/**
 * Step 17: Orders Kanban Board
 * Visual order tracking with real-time updates
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Package,
  Building2,
  CheckCircle2,
  Truck,
  AlertCircle,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import io, { Socket } from 'socket.io-client';

interface Order {
  id: string;
  customer_name: string;
  process: string;
  material: string;
  quantity: number;
  status:
    | 'awaiting_routing'
    | 'routed'
    | 'in_production'
    | 'qc'
    | 'shipped'
    | 'completed';
  supplier_id?: string;
  supplier_name?: string;
  routing_notes?: string;
  routed_at?: string;
  created_at: string;
  updated_at: string;
}

interface OrderRoutedEvent {
  orderId: string;
  supplierId: string;
  supplierName: string;
  routedAt: string;
  routedBy: string;
}

const COLUMNS = [
  {
    id: 'awaiting_routing',
    label: 'Awaiting Routing',
    icon: AlertCircle,
    color: 'text-orange-500',
  },
  { id: 'routed', label: 'Routed', icon: CheckCircle2, color: 'text-blue-500' },
  {
    id: 'in_production',
    label: 'In Production',
    icon: Package,
    color: 'text-purple-500',
  },
  { id: 'qc', label: 'QC', icon: CheckCircle2, color: 'text-yellow-500' },
  { id: 'shipped', label: 'Shipped', icon: Truck, color: 'text-green-500' },
];

export default function OrdersKanbanPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const queryClient = useQueryClient();

  // Fetch orders
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['orders', 'kanban'],
    queryFn: async () => {
      const res = await fetch('/api/orders?view=kanban', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch orders');
      return res.json();
    },
    refetchInterval: 30_000, // Fallback polling
  });

  // WebSocket connection
  useEffect(() => {
    const socketInstance = io({
      path: '/api/socket.io',
      transports: ['websocket'],
    });

    socketInstance.on('connect', () => {
      console.log('[Kanban] WebSocket connected');
      socketInstance.emit('join', { channel: 'orders' });
    });

    socketInstance.on('ORDER_ROUTED', (event: OrderRoutedEvent) => {
      console.log('[Kanban] Order routed:', event);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    socketInstance.on('disconnect', () => {
      console.log('[Kanban] WebSocket disconnected');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [queryClient]);

  const ordersByStatus = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = orders.filter((o) => o.status === col.id);
      return acc;
    },
    {} as Record<string, Order[]>,
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders Kanban</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track order routing and production status
              {socket?.connected && (
                <span className="ml-2 inline-flex items-center gap-1 text-green-600">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  {' '}
                  Live
                </span>
              )}
            </p>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold">{orders.length}</span> total orders
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto p-6">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-2 text-gray-600">Loading orders...</p>
          </div>
        ) : (
          <div className="flex gap-4 h-full" style={{ minWidth: 'max-content' }}>
            {COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                orders={ordersByStatus[column.id] || []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Kanban Column Component
function KanbanColumn({
  column,
  orders,
}: {
  column: (typeof COLUMNS)[0];
  orders: Order[];
}) {
  const Icon = column.icon;

  return (
    <div className="flex-shrink-0 w-80 flex flex-col bg-gray-100 rounded-lg">
      <div className="p-4 border-b bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon size={18} className={column.color} />
            <h3 className="font-semibold text-gray-900">{column.label}</h3>
          </div>
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-200 text-gray-700 rounded-full">
            {orders.length}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No orders</div>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </div>
    </div>
  );
}

// Order Card Component
function OrderCard({ order }: { order: Order }) {
  const formattedDate = new Date(order.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-white border rounded-lg p-3 hover:shadow-md transition cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="font-medium text-gray-900 text-sm mb-1">
            {order.customer_name}
          </div>
          <div className="text-xs text-gray-500">Order #{order.id.slice(0, 8)}</div>
        </div>
        <div className="text-xs text-gray-500">{formattedDate}</div>
      </div>

      <div className="space-y-1 mb-2 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <Package size={12} className="text-gray-400" />
          {order.process} • {order.material}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-400">Qty:</span>
          {order.quantity}
        </div>
      </div>

      {order.supplier_name && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t text-xs">
          <Building2 size={12} className="text-blue-500" />
          <span className="text-gray-700">{order.supplier_name}</span>
        </div>
      )}

      {order.routing_notes && (
        <div className="mt-2 pt-2 border-t text-xs text-gray-600 italic">
          {order.routing_notes}
        </div>
      )}
    </div>
  );
}
