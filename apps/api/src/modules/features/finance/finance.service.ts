import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";
import { WebhookEvent, Invoice, Refund, FinanceSettings } from "@cnc-quote/shared";

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  // Webhook Events
  async getWebhookEvents(filters: {
    provider?: string;
    status?: string;
    q?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const { provider, status, q, date_from, date_to } = filters;

    let query = this.supabase.client
      .from('webhook_events')
      .select('*')
      .order('received_at', { ascending: false });

    if (provider && provider !== 'All') {
      query = query.eq('provider', provider.toLowerCase());
    }

    if (status && status !== 'All') {
      const processed = status === 'Processed';
      query = query.eq('processed', processed);
    }

    if (q) {
      query = query.or(`event_type.ilike.%${q}%,idempotency_key.ilike.%${q}%`);
    }

    if (date_from) {
      query = query.gte('received_at', date_from);
    }

    if (date_to) {
      query = query.lte('received_at', date_to);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch webhook events', error);
      throw new BadRequestException('Failed to fetch webhook events');
    }

    return data;
  }

  async getWebhookEvent(id: string): Promise<WebhookEvent> {
    const { data, error } = await this.supabase.client
      .from('webhook_events')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('Webhook event not found');
    }

    return data;
  }

  async replayWebhookEvent(id: string) {
    const event = await this.getWebhookEvent(id);

    if (!event.signature_ok) {
      throw new BadRequestException('Cannot replay event with invalid signature');
    }

    // TODO: Implement webhook replay logic with BullMQ
    // For now, just mark as processed
    await this.supabase.client
      .from('webhook_events')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Audit log
    await this.auditLog('webhook_replayed', id);

    return { success: true };
  }

  // Invoices
  async getInvoices(filters: {
    status?: string;
    q?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const { status, q, date_from, date_to } = filters;

    let query = this.supabase.client
      .from('invoices')
      .select(`
        *,
        order:orders(id, status),
        quote:quotes(id, status)
      `)
      .order('issued_at', { ascending: false });

    if (status && status !== 'Any') {
      query = query.eq('status', status.toLowerCase());
    }

    if (q) {
      query = query.or(`id.ilike.%${q}%,order_id.ilike.%${q}%`);
    }

    if (date_from) {
      query = query.gte('issued_at', date_from);
    }

    if (date_to) {
      query = query.lte('issued_at', date_to);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch invoices', error);
      throw new BadRequestException('Failed to fetch invoices');
    }

    return data;
  }

  async resendInvoiceReceipt(invoiceId: string) {
    const { data: invoice, error } = await this.supabase.client
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error || !invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // TODO: Implement email sending logic
    // For now, just log the action
    this.logger.log(`Resending receipt for invoice ${invoiceId}`);

    // Audit log
    await this.auditLog('invoice_receipt_resent', invoiceId);

    return { success: true };
  }

  async getInvoicePdf(invoiceId: string) {
    const invoice = await this.supabase.client
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (invoice.error || !invoice.data) {
      throw new NotFoundException('Invoice not found');
    }

    // TODO: Generate PDF logic
    // For now, return placeholder
    return { pdf_url: `https://api.example.com/invoices/${invoiceId}/pdf` };
  }

  // Refunds
  async getRefunds(filters: {
    status?: string;
    q?: string;
  }) {
    const { status, q } = filters;

    let query = this.supabase.client
      .from('refunds')
      .select(`
        *,
        invoice:invoices(id, order_id),
        order:orders(id, status)
      `)
      .order('created_at', { ascending: false });

    if (status && status !== 'Any') {
      query = query.eq('status', status.toLowerCase());
    }

    if (q) {
      query = query.or(`id.ilike.%${q}%,invoice_id.ilike.%${q}%,order_id.ilike.%${q}%`);
    }

    const { data, error } = await query;

    if (error) {
      this.logger.error('Failed to fetch refunds', error);
      throw new BadRequestException('Failed to fetch refunds');
    }

    return data;
  }

  async createRefund(refundData: {
    invoice_id?: string;
    order_id?: string;
    amount: number;
    reason: string;
    notify_customer: boolean;
  }) {
    // Validate refund amount against invoice/order
    let invoiceId = refundData.invoice_id;
    let orderId = refundData.order_id;

    if (!invoiceId && !orderId) {
      throw new BadRequestException('Either invoice_id or order_id must be provided');
    }

    // TODO: Implement refund creation logic with Stripe/PayPal
    // For now, create refund record
    const { data, error } = await this.supabase.client
      .from('refunds')
      .insert({
        invoice_id: invoiceId,
        order_id: orderId,
        amount: refundData.amount,
        reason: refundData.reason,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Failed to create refund', error);
      throw new BadRequestException('Failed to create refund');
    }

    // Audit log
    await this.auditLog('refund_created', data.id, refundData);

    return data;
  }

  async resendRefundNotification(refundId: string) {
    const { data: refund, error } = await this.supabase.client
      .from('refunds')
      .select('*')
      .eq('id', refundId)
      .single();

    if (error || !refund) {
      throw new NotFoundException('Refund not found');
    }

    // TODO: Implement notification sending logic
    this.logger.log(`Resending notification for refund ${refundId}`);

    // Audit log
    await this.auditLog('refund_notification_resent', refundId);

    return { success: true };
  }

  // Finance Settings
  async getFinanceSettings(): Promise<FinanceSettings> {
    const { data, error } = await this.supabase.client
      .from('finance_settings')
      .select('*')
      .single();

    if (error) {
      // Return default settings if not found
      return {
        tax_mode: 'none',
        default_tax_rate: 0,
        regions: [],
        incoterms_enabled: ['EXW', 'FOB', 'DDP'],
        default_incoterm: 'EXW',
        shipping_estimators: ['table_rate'],
        currency: 'USD',
        test_mode: false,
        updated_at: new Date().toISOString(),
        updated_by: 'system',
      };
    }

    return data;
  }

  async updateFinanceSettings(settings: Partial<FinanceSettings>, userId: string) {
    const { error } = await this.supabase.client
      .from('finance_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString(),
        updated_by: userId,
      });

    if (error) {
      this.logger.error('Failed to update finance settings', error);
      throw new BadRequestException('Failed to update finance settings');
    }

    // Invalidate cache
    const keys = await this.cache.keys('finance_settings:*');
    for (const key of keys) {
      await this.cache.del(key);
    }

    // Audit log
    await this.auditLog('finance_settings_updated', null, { settings, userId });

    return { success: true };
  }

  async resetFinanceSettings(userId: string) {
    const defaultSettings = {
      tax_mode: 'none',
      default_tax_rate: 0,
      regions: [],
      incoterms_enabled: ['EXW', 'FOB', 'DDP'],
      default_incoterm: 'EXW',
      shipping_estimators: ['table_rate'],
      currency: 'USD',
      test_mode: false,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    };

    const { error } = await this.supabase.client
      .from('finance_settings')
      .upsert(defaultSettings);

    if (error) {
      this.logger.error('Failed to reset finance settings', error);
      throw new BadRequestException('Failed to reset finance settings');
    }

    // Invalidate cache
    const keys = await this.cache.keys('finance_settings:*');
    for (const key of keys) {
      await this.cache.del(key);
    }

    // Audit log
    await this.auditLog('finance_settings_reset', null, { userId });

    return { success: true };
  }

  private async auditLog(action: string, recordId: string | null, metadata?: any) {
    await this.supabase.client
      .from('audit_events')
      .insert({
        table_name: 'finance',
        record_id: recordId,
        action,
        metadata,
        created_at: new Date().toISOString(),
      });
  }
}
