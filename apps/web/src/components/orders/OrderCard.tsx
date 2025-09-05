import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { Order } from '../../hooks/useOrders';
import { Badge } from '../ui/badge';

interface OrderCardProps {
  order: Order;
  onClick: () => void;
}

export function OrderCard({ order, onClick }: OrderCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        bg-white rounded-lg border border-gray-200 p-4 cursor-pointer
        hover:shadow-md transition-shadow duration-200
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-medium text-gray-900 text-sm">
            {order.order_number || `Order ${order.id.slice(-8)}`}
          </h4>
          <p className="text-xs text-gray-500">
            {format(new Date(order.created_at), 'MMM dd, yyyy')}
          </p>
        </div>
        <Badge className={getPriorityColor(order.priority)}>
          {order.priority}
        </Badge>
      </div>

      {/* Customer */}
      {order.customer && (
        <div className="mb-3">
          <p className="text-sm font-medium text-gray-900">
            {order.customer.name}
          </p>
          <p className="text-xs text-gray-500">
            {order.customer.email}
          </p>
        </div>
      )}

      {/* Amount and Items */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">
          {formatCurrency(order.total_amount, order.currency)}
        </div>
        {order._count && (
          <div className="text-xs text-gray-500">
            {order._count.order_items} items
          </div>
        )}
      </div>

      {/* Status Indicator */}
      <div className="mt-3 flex items-center">
        <div className="flex-1 bg-gray-200 rounded-full h-1">
          <div
            className="bg-blue-600 h-1 rounded-full"
            style={{ width: '60%' }} // TODO: Calculate based on actual progress
          />
        </div>
        <span className="ml-2 text-xs text-gray-500">60%</span>
      </div>
    </div>
  );
}
