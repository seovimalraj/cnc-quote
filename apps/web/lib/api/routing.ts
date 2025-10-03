/**
 * Step 17: Routing API Client
 * Frontend API for routing candidates and order assignment
 */

import type {
  GetCandidatesDto,
  CandidatesResponse,
  AssignSupplierDto,
  AssignSupplierResponse,
  CreateRoutingRuleDto,
  RoutingRule,
} from '@cnc-quote/shared';

class RoutingApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
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

  async getCandidates(dto: GetCandidatesDto): Promise<CandidatesResponse> {
    return this.request<CandidatesResponse>('/routing/candidates', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async createRule(dto: CreateRoutingRuleDto): Promise<RoutingRule> {
    return this.request<RoutingRule>('/routing/rules', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async assignSupplier(
    orderId: string,
    dto: AssignSupplierDto,
  ): Promise<AssignSupplierResponse> {
    return this.request<AssignSupplierResponse>(
      `/orders/${orderId}/assign_supplier`,
      {
        method: 'POST',
        body: JSON.stringify(dto),
      },
    );
  }
}

export const routingApi = new RoutingApiClient();
