/**
 * Step 15: Quote Revisions API Client
 * Frontend API methods for quote expiration and repricing
 */

export interface PricingDiffLineItem {
  factor: string;
  old: number;
  new: number;
  delta: number;
  delta_pct: number;
  reason: string | null;
}

export interface PricingDiff {
  total_delta: number;
  pct_delta: number;
  line_items: PricingDiffLineItem[];
  lead_time_delta_days: number | null;
  tax_delta: number | null;
  warnings: string[];
  old_pricing_version: string;
  new_pricing_version: string;
}

export interface QuoteRevision {
  id: string;
  quote_id: string;
  version: number;
  diff_json: PricingDiff;
  note: string | null;
  restore_of_revision_id: string | null;
  created_by_user_id: string;
  created_at: string;
  total_delta: number;
  pct_delta: number;
}

export interface ExtendExpirationRequest {
  days: number;
}

export interface ExtendExpirationResponse {
  quote_id: string;
  old_expires_at: string | null;
  new_expires_at: string;
  extended_by_days: number;
}

export type RepriceStrategy = 'baseline' | 'no_tax' | 'with_tax';

export interface RepriceRequest {
  strategy?: RepriceStrategy;
  dryRun?: boolean;
  note?: string;
}

export interface RepriceResponse {
  diff: PricingDiff;
  revision_id: string | null;
  repriced_at: string;
  status: string;
  version: number;
}

class QuoteRevisionsApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get all revisions for a quote
   */
  async getRevisions(quoteId: string): Promise<QuoteRevision[]> {
    return this.request<QuoteRevision[]>(`/quotes/${quoteId}/revisions`, {
      method: 'GET',
    });
  }

  /**
   * Get a specific revision
   */
  async getRevision(revisionId: string): Promise<QuoteRevision> {
    return this.request<QuoteRevision>(`/quotes/revisions/${revisionId}`, {
      method: 'GET',
    });
  }

  /**
   * Extend quote expiration
   */
  async extendExpiration(
    quoteId: string,
    days: number
  ): Promise<ExtendExpirationResponse> {
    return this.request<ExtendExpirationResponse>(
      `/quotes/${quoteId}/extend-expiration`,
      {
        method: 'PATCH',
        body: JSON.stringify({ days }),
      }
    );
  }

  /**
   * Reprice a quote (generate new pricing)
   */
  async repriceQuote(
    quoteId: string,
    options: RepriceRequest = {}
  ): Promise<RepriceResponse> {
    return this.request<RepriceResponse>(`/quotes/${quoteId}/reprice`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }
}

export const quotesRevisionsApi = new QuoteRevisionsApiClient();
