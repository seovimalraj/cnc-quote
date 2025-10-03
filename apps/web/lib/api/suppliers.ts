/**
 * Step 17: Suppliers API Client
 * Frontend API for supplier CRUD and capabilities
 */

import type {
  SupplierProfile,
  CreateSupplierDto,
  UpdateSupplierDto,
  Capability,
  AttachFileDto,
  SupplierFile,
} from '@cnc-quote/shared';

class SuppliersApiClient {
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

  async list(filters?: {
    active?: boolean;
    region?: string;
    process?: string;
  }): Promise<SupplierProfile[]> {
    const params = new URLSearchParams();
    if (filters?.active !== undefined) params.append('active', String(filters.active));
    if (filters?.region) params.append('region', filters.region);
    if (filters?.process) params.append('process', filters.process);

    const query = params.toString();
    const path = query ? `/suppliers?${query}` : '/suppliers';
    return this.request<SupplierProfile[]>(path);
  }

  async get(id: string): Promise<SupplierProfile> {
    return this.request<SupplierProfile>(`/suppliers/${id}`);
  }

  async create(dto: CreateSupplierDto): Promise<SupplierProfile> {
    return this.request<SupplierProfile>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }

  async update(id: string, dto: UpdateSupplierDto): Promise<SupplierProfile> {
    return this.request<SupplierProfile>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(dto),
    });
  }

  async delete(id: string): Promise<void> {
    await this.request<void>(`/suppliers/${id}`, {
      method: 'DELETE',
    });
  }

  async addCapability(
    id: string,
    capability: Omit<Capability, 'id'>,
  ): Promise<Capability> {
    return this.request<Capability>(`/suppliers/${id}/capabilities`, {
      method: 'POST',
      body: JSON.stringify(capability),
    });
  }

  async attachFile(id: string, dto: AttachFileDto): Promise<SupplierFile> {
    return this.request<SupplierFile>(`/suppliers/${id}/files`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  }
}

export const suppliersApi = new SuppliersApiClient();
