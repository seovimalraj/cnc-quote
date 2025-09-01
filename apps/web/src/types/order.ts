export interface Order {
  id: string;
  status: 'pending' | 'confirmed' | 'processing' | 'completed' | 'canceled';
  currency: string;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  status: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}
