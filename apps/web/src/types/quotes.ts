export interface QuoteBreakdown {
  materials: number;
  machining: number;
  finishing: number;
  overhead: number;
  margin: number;
}

export interface QuoteFile {
  id: string;
  name: string;
  type: string;
  size: number;
  metrics?: {
    volume: number;
    surface_area: number;
    features: Array<{
      type: string;
      count: number;
    }>;
  };
}

// Local interface for the quote wizard (partial/draft state)
export interface Quote {
  files: QuoteFile[];
  material?: string;
  finish?: string;
  tolerance?: string;
  quantity?: number;
  price?: {
    unit_price: number;
    total_price: number;
    breakdown: QuoteBreakdown;
  };
  isValid: boolean;
}
