import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface Order {
  id: string;
  order_number: string;
  status: string;
  priority: string;
  total_amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  items?: Array<{
    id: string;
    quantity: number;
    status: string;
  }>;
  _count?: {
    order_items: number;
  };
}

export interface KanbanData {
  draft: Order[];
  pending_approval: Order[];
  approved: Order[];
  in_production: Order[];
  quality_check: Order[];
  shipping: Order[];
  completed: Order[];
  cancelled: Order[];
}

export function useOrders() {
  const { user } = useAuth();
  const [kanbanData, setKanbanData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKanbanData = useCallback(async () => {
    if (!user?.organizationId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/orders/kanban/${user.organizationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch kanban data');
      }

      const data = await response.json();
      setKanbanData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId]);

  const moveOrder = useCallback(async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to move order');
      }

      // Optimistically update the local state
      setKanbanData(prevData => {
        if (!prevData) return prevData;

        const newData = { ...prevData };
        let movedOrder: Order | undefined;

        // Find and remove the order from its current status
        Object.keys(newData).forEach(status => {
          const orders = newData[status as keyof KanbanData];
          const orderIndex = orders.findIndex(order => order.id === orderId);
          if (orderIndex !== -1) {
            [movedOrder] = orders.splice(orderIndex, 1);
          }
        });

        // Add the order to the new status
        if (movedOrder) {
          movedOrder.status = newStatus;
          newData[newStatus as keyof KanbanData].push(movedOrder);
        }

        return newData;
      });

      // Refresh data from server to ensure consistency
      await fetchKanbanData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move order');
      // Revert optimistic update on error
      await fetchKanbanData();
      throw err;
    }
  }, [fetchKanbanData]);

  const refreshKanban = useCallback(() => {
    fetchKanbanData();
  }, [fetchKanbanData]);

  useEffect(() => {
    fetchKanbanData();
  }, [fetchKanbanData]);

  return {
    kanbanData,
    loading,
    error,
    moveOrder,
    refreshKanban,
  };
}
