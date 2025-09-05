import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { DndContext, DragEndEvent, DragOverEvent, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanColumn } from '../../components/orders/KanbanColumn';
import { OrderCard } from '../../components/orders/OrderCard';
import { OrderFilters } from '../../components/orders/OrderFilters';
import { OrderSearch } from '../../components/orders/OrderSearch';
import { useOrders } from '../../hooks/useOrders';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';

const ORDER_STATUSES = [
  { id: 'draft', title: 'Draft', color: 'bg-gray-100' },
  { id: 'pending_approval', title: 'Pending Approval', color: 'bg-yellow-100' },
  { id: 'approved', title: 'Approved', color: 'bg-blue-100' },
  { id: 'in_production', title: 'In Production', color: 'bg-purple-100' },
  { id: 'quality_check', title: 'Quality Check', color: 'bg-orange-100' },
  { id: 'shipping', title: 'Shipping', color: 'bg-indigo-100' },
  { id: 'completed', title: 'Completed', color: 'bg-green-100' },
  { id: 'cancelled', title: 'Cancelled', color: 'bg-red-100' },
];

export default function OrdersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { kanbanData, loading, error, moveOrder, refreshKanban } = useOrders();
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    customerId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    // Optional: Add visual feedback
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Optional: Handle drag over logic
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const orderId = active.id as string;
    const newStatus = over.id as string;

    // Find current order to check if status actually changed
    const currentOrder = Object.values(kanbanData || {}).flat().find(order => order.id === orderId);
    if (!currentOrder || currentOrder.status === newStatus) return;

    try {
      await moveOrder(orderId, newStatus);
      // Optimistic update will be handled by the hook
    } catch (error) {
      console.error('Failed to move order:', error);
      // Error handling will be managed by the hook
    }
  };

  const handleOrderClick = (orderId: string) => {
    router.push(`/admin/orders/${orderId}`);
  };

  const handleRefresh = () => {
    refreshKanban();
  };

  const filteredKanbanData = kanbanData ? Object.entries(kanbanData).reduce((acc, [status, orders]) => {
    acc[status] = orders.filter(order => {
      // Apply filters
      if (filters.status && status !== filters.status) return false;
      if (filters.priority && order.priority !== filters.priority) return false;
      if (filters.customerId && order.customer?.id !== filters.customerId) return false;

      // Apply search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          order.order_number?.toLowerCase().includes(query) ||
          order.customer?.name?.toLowerCase().includes(query) ||
          order.customer?.email?.toLowerCase().includes(query)
        );
      }

      return true;
    });
    return acc;
  }, {} as typeof kanbanData) : {};

  if (loading && !kanbanData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Error loading orders: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Workcenter</h1>
          <p className="text-gray-600">Manage and track all customer orders</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => router.push('/admin/orders/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-6 border-b bg-gray-50">
        <div className="flex items-center gap-4">
          <OrderSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search orders..."
          />
          <OrderFilters
            filters={filters}
            onChange={setFilters}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 p-6 overflow-x-auto">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 h-full min-w-max">
            {ORDER_STATUSES.map((status) => (
              <KanbanColumn
                key={status.id}
                id={status.id}
                title={status.title}
                color={status.color}
                count={filteredKanbanData[status.id]?.length || 0}
              >
                <SortableContext
                  items={filteredKanbanData[status.id]?.map(order => order.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {filteredKanbanData[status.id]?.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onClick={() => handleOrderClick(order.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </KanbanColumn>
            ))}
          </div>
        </DndContext>
      </div>
    </div>
  );
}
