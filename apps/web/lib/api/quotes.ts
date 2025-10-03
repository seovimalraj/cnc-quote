/**
 * Step 14: Quotes API Client
 * Type-safe client for quote outcomes and margins endpoints
 */

// ============================================
// Types
// ============================================

export type QuoteOutcomeStatus = 'accepted' | 'rejected' | 'expired' | 'rescinded';

export interface SetOutcomeRequest {
  status: QuoteOutcomeStatus;
  reason_code?: string;
  reason_notes?: string;
  amount?: number;
  meta?: Record<string, any>;
}

export interface OutcomeResponse {
  quote_id: string;
  org_id: string;
  status: QuoteOutcomeStatus;
  reason_code: string | null;
  reason_notes: string | null;
  amount: number | null;
  decided_by: string;
  decided_at: string;
  meta: Record<string, any>;
}

export interface ReasonCode {
  code: string;
  label: string;
  description: string;
  is_active: boolean;
}

export interface CostBreakdown {
  setup_time_cost: number;
  machine_time_cost: number;
  material_cost: number;
  finish_cost: number;
  risk_markup: number;
  tolerance_multiplier_cost: number;
  overhead_cost: number;
  margin_amount: number;
}

export interface LineMargin {
  line_id: string;
  process: string;
  material: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  line_cost_breakdown: CostBreakdown;
  margin_amount: number;
  margin_pct: number;
}

export interface QuoteMargins {
  quote: {
    id: string;
    total_price: number;
    gross_margin_amount: number;
    gross_margin_pct: number;
  };
  lines: LineMargin[];
}

export interface OutcomesListFilters {
  status?: QuoteOutcomeStatus;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export interface OutcomesListResponse {
  data: OutcomeResponse[];
  total: number;
  page: number;
  limit: number;
}

// ============================================
// API Client
// ============================================

export class QuotesApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string = '/api', token?: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: response.statusText,
      }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // ============================================
  // Outcomes Methods
  // ============================================

  /**
   * Get outcome for a quote
   */
  async getOutcome(quoteId: string): Promise<OutcomeResponse | null> {
    try {
      return await this.request<OutcomeResponse>(`/quotes/${quoteId}/outcome`);
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Set or update outcome for a quote
   */
  async setOutcome(
    quoteId: string,
    data: SetOutcomeRequest,
  ): Promise<OutcomeResponse> {
    return this.request<OutcomeResponse>(`/quotes/${quoteId}/outcome`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete outcome for a quote
   */
  async deleteOutcome(quoteId: string): Promise<void> {
    return this.request<void>(`/quotes/${quoteId}/outcome`, {
      method: 'DELETE',
    });
  }

  /**
   * List outcomes with filters
   */
  async listOutcomes(
    filters?: OutcomesListFilters,
  ): Promise<OutcomesListResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const query = params.toString();
    return this.request<OutcomesListResponse>(
      `/quotes/outcomes${query ? `?${query}` : ''}`,
    );
  }

  // ============================================
  // Margins Methods
  // ============================================

  /**
   * Get margins for a quote
   */
  async getMargins(quoteId: string): Promise<QuoteMargins> {
    return this.request<QuoteMargins>(`/quotes/${quoteId}/margins`);
  }

  /**
   * Export margins as CSV (returns blob for download)
   */
  async exportMarginsCsv(filters?: {
    date_from?: string;
    date_to?: string;
    status?: string;
    customer_id?: string;
  }): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);

    const query = params.toString();
    const headers: Record<string, string> = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(
      `${this.baseUrl}/quotes/export/margins.csv${query ? `?${query}` : ''}`,
      { headers },
    );

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  }

  /**
   * Export margins as JSON
   */
  async exportMarginsJson(filters?: {
    date_from?: string;
    date_to?: string;
    status?: string;
    customer_id?: string;
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.customer_id) params.append('customer_id', filters.customer_id);

    const query = params.toString();
    return this.request<any>(
      `/quotes/export/margins.json${query ? `?${query}` : ''}`,
    );
  }

  // ============================================
  // Lookups Methods
  // ============================================

  /**
   * Get active reason codes for outcomes
   */
  async getReasonCodes(): Promise<ReasonCode[]> {
    return this.request<ReasonCode[]>('/lookups/outcome-reasons');
  }
}

// ============================================
// Default Export
// ============================================

export const quotesApi = new QuotesApiClient();
