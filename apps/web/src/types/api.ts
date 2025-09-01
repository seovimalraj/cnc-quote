export interface ApiResponse<T> {
  data: T
  error: null | {
    message: string
    code: string
  }
}

export interface Machine {
  id: string
  name: string
  type: string
  capacity: number
  hourlyRate: number
}

export interface QapTemplate {
  id: string
  name: string
  content: string
  version: number
  createdAt: string
  updatedAt: string
}

export interface Order {
  id: string
  status: string
  customer: {
    id: string
    name: string
  }
  items: OrderItem[]
  total: number
}

export interface OrderItem {
  id: string
  productId: string
  quantity: number
  price: number
}

export interface PayPalOrderDetails {
  id: string;
  status: string;
  orderId?: string;
  error?: {
    message: string;
  };
  payer?: {
    email_address: string;
    payer_id: string;
  };
}

export interface FileMetrics {
  dimensions: {
    x: number
    y: number
    z: number
  }
  volume: number
  surfaceArea: number
  features: {
    holes: number
    pockets: number
    threads: number
  }
}
