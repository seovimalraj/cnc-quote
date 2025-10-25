export class CreateQuoteDto {
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  customer_company?: string;
  customer_address?: string;
  notes?: string;
  terms?: string;
  shipping_address?: string;
  billing_address?: string;
  items: {
    file_id: string;
    material_id: string;
    quantity: number;
    process_type: string;
    finish_ids?: string[];
    features?: Record<string, number>;
    complexity_multiplier?: number;
  }[];
  currency?: string;
  is_rush?: boolean;
}

export class UpdateQuoteDto {
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_company?: string;
  customer_address?: string;
  notes?: string;
  terms?: string;
  shipping_address?: string;
  billing_address?: string;
  items?: {
    file_id: string;
    material_id: string;
    quantity: number;
    process_type: string;
    finish_ids?: string[];
    features?: Record<string, number>;
    complexity_multiplier?: number;
  }[];
  currency?: string;
  status?: string;
  is_rush?: boolean;
}
