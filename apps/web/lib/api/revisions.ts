/**
 * Step 16: Revisions API Client
 * Type-safe client for revision timeline and comparison
 */

export type EventType = 'user_update' | 'system_reprice' | 'tax_update' | 'restore' | 'initial';

export interface FieldChange {
  path: string;
  from: any;
  to: any;
}

export interface FactorDelta {
  factor: string;
  delta: number;
  pct: number;
  from?: number;
  to?: number;
}

export interface LineDelta {
  line_id: string;
  price_from: number | null;
  price_to: number | null;
  factor_deltas: FactorDelta[];
}

export interface DiffSummary {
  total_delta_amount: number;
  total_delta_pct: number;
}

export interface RevisionDiff {
  summary: DiffSummary;
  by_factor: FactorDelta[];
  fields: FieldChange[];
  lines: LineDelta[];
}

export interface RevisionListItem {
  id: string;
  created_at: string;
  event_type: EventType;
  actor: {
    id: string | null;
    name: string;
  };
  delta_amount: number;
  delta_pct: number;
  note: string | null;
  time_group?: string;
}

export interface QuoteRevision {
  id: string;
  org_id: string;
  quote_id: string;
  user_id: string | null;
  version: number;
  event_type: EventType;
  pricing_hash: string | null;
  snapshot_json: any;
  diff_json: RevisionDiff;
  note: string | null;
  restored_from_revision_id: string | null;
  created_at: string;
  total_delta: number;
  pct_delta: number;
  actor?: {
    id: string | null;
    name: string;
  };
}

export interface RevisionsListResponse {
  items: RevisionListItem[];
  next_cursor?: string;
}

export interface CompareRevisionsRequest {
  a: string;
  b: string;
}

export interface CompareRevisionsResponse {
  a: QuoteRevision;
  b: QuoteRevision;
  diff_json: RevisionDiff;
}

export interface RestoreRevisionRequest {
  note?: string;
}

export interface RestoreRevisionResponse {
  new_revision_id: string;
  quote: any;
}

export interface UpdateNoteRequest {
  note: string;
}

class RevisionsApiClient {
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
   * List revisions for a quote
   */
  async listRevisions(
    quoteId: string,
    options?: { cursor?: string; limit?: number },
  ): Promise<RevisionsListResponse> {
    const params = new URLSearchParams();
    if (options?.cursor) params.set('cursor', options.cursor);
    if (options?.limit) params.set('limit', options.limit.toString());

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<RevisionsListResponse>(
      `/quotes/${quoteId}/revisions${query}`,
      { method: 'GET' },
    );
  }

  /**
   * Get a specific revision
   */
  async getRevision(quoteId: string, revisionId: string): Promise<QuoteRevision> {
    return this.request<QuoteRevision>(
      `/quotes/${quoteId}/revisions/${revisionId}`,
      { method: 'GET' },
    );
  }

  /**
   * Compare two revisions
   */
  async compareRevisions(
    quoteId: string,
    data: CompareRevisionsRequest,
  ): Promise<CompareRevisionsResponse> {
    return this.request<CompareRevisionsResponse>(
      `/quotes/${quoteId}/revisions/compare`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Restore a revision
   */
  async restoreRevision(
    quoteId: string,
    revisionId: string,
    data: RestoreRevisionRequest,
  ): Promise<RestoreRevisionResponse> {
    return this.request<RestoreRevisionResponse>(
      `/quotes/${quoteId}/revisions/${revisionId}/restore`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  /**
   * Update revision note
   */
  async updateNote(
    quoteId: string,
    revisionId: string,
    data: UpdateNoteRequest,
  ): Promise<{ ok: boolean }> {
    return this.request<{ ok: boolean }>(
      `/quotes/${quoteId}/revisions/${revisionId}/note`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }
}

export const revisionsApi = new RevisionsApiClient();
