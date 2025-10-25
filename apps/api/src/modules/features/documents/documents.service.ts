import { Injectable } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { QapService } from "../qap/qap.service";
import { FileMeta, QAPDocument, Certificate, FAIRReport, Invoice } from "@cnc-quote/shared";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly qapService: QapService,
  ) {}

  // QAP Document Methods
  async generateQapDocument(orderId: string, templateId: string, userId: string, orgId: string) {
    try {
      // Generate QAP document using the QAP service
      const qapResult = await this.qapService.generateQapDocument({
        templateId,
        orderId,
        orgId,
        userId,
        documentData: {}, // Will be populated by the QAP service
      });

      // Create QAP document record
      const fileId = (qapResult as any)?.fileId ?? (qapResult as any)?.file?.id ?? null;
      const { data: qapDoc } = await this.supabase.client
        .from('qap_documents')
        .insert({
          org_id: orgId,
          order_id: orderId,
          template_id: templateId,
          status: 'Generated',
          file_id: fileId,
          generated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return qapDoc;
    } catch (error) {
      console.error('Error generating QAP document:', error);
      throw error;
    }
  }

  async regenerateQapDocument(qapId: string, userId: string) {
    const { data: qapDoc } = await this.supabase.client
      .from('qap_documents')
      .select('order_id, template_id, org_id')
      .eq('id', qapId)
      .single();

    if (!qapDoc) {
      throw new Error('QAP document not found');
    }

    return this.generateQapDocument(qapDoc.order_id, qapDoc.template_id, userId, qapDoc.org_id);
  }

  async getQapDocuments(orgId: string, filters: any = {}) {
    let query = this.supabase.client
      .from('qap_documents')
      .select(`
        *,
        order:orders (
          id,
          order_number,
          customer:customers (name)
        ),
        template:qap_templates (name, version),
        file:file_meta (name, size_bytes, mime)
      `)
      .eq('org_id', orgId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.orderId) {
      query = query.eq('order_id', filters.orderId);
    }

    const { data } = await query.order('generated_at', { ascending: false });
    return data || [];
  }

  // Certificate Methods
  async getCertificates(orgId: string, filters: any = {}) {
    let query = this.supabase.client
      .from('certificates')
      .select(`
        *,
        order:orders (
          id,
          order_number,
          customer:customers (name)
        ),
        order_line:order_items (
          id,
          quantity
        ),
        file:file_meta (name, size_bytes, mime),
        verified_by_user:users (name, email)
      `)
      .eq('org_id', orgId);

    if (filters.type) {
      query = query.eq('type', filters.type);
    }

    if (filters.verified !== undefined) {
      query = query.eq('verified', filters.verified);
    }

    if (filters.orderId) {
      query = query.eq('order_id', filters.orderId);
    }

    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  }

  async verifyCertificate(certId: string, userId: string) {
    const { data: cert } = await this.supabase.client
      .from('certificates')
      .update({
        verified: true,
        verified_by: userId,
        verified_at: new Date().toISOString(),
      })
      .eq('id', certId)
      .select()
      .single();

    return cert;
  }

  async linkCertificateToOrder(certId: string, orderId: string, orderLineId?: string) {
    const { data: cert } = await this.supabase.client
      .from('certificates')
      .update({
        order_id: orderId,
        order_line_id: orderLineId,
      })
      .eq('id', certId)
      .select()
      .single();

    return cert;
  }

  // FAIR Report Methods
  async getFairReports(orgId: string, filters: any = {}) {
    let query = this.supabase.client
      .from('fair_reports')
      .select(`
        *,
        order:orders (
          id,
          order_number,
          customer:customers (name)
        ),
        file:file_meta (name, size_bytes, mime)
      `)
      .eq('org_id', orgId);

    if (filters.standard) {
      query = query.eq('standard', filters.standard);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.orderId) {
      query = query.eq('order_id', filters.orderId);
    }

    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  }

  async reviewFairReport(fairId: string, notes: string, userId: string) {
    const { data: report } = await this.supabase.client
      .from('fair_reports')
      .update({
        status: 'Reviewed',
        review_notes: notes,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', fairId)
      .select()
      .single();

    return report;
  }

  // Invoice Methods
  async getInvoices(orgId: string, filters: any = {}) {
    let query = this.supabase.client
      .from('invoices')
      .select(`
        *,
        order:orders (
          id,
          order_number,
          customer:customers (name)
        ),
        file:file_meta (name, size_bytes, mime)
      `)
      .eq('org_id', orgId);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.provider) {
      query = query.eq('provider', filters.provider);
    }

    if (filters.orderId) {
      query = query.eq('order_id', filters.orderId);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  }

  async refundInvoice(invoiceId: string, userId: string) {
    // This would integrate with payment provider (Stripe/PayPal)
    // For now, just update the status
    const { data: invoice } = await this.supabase.client
      .from('invoices')
      .update({
        status: 'Refunded',
      })
      .eq('id', invoiceId)
      .select()
      .single();

    return invoice;
  }

  // File Methods
  async getFiles(orgId: string, filters: any = {}) {
    let query = this.supabase.client
      .from('file_meta')
      .select(`
        *,
        owner:users (name, email),
        linked_quotes:quotes (id, status),
        linked_orders:orders (id, order_number, status)
      `)
      .eq('org_id', orgId)
      .is('deleted_at', null);

    if (filters.kind) {
      query = query.eq('kind', filters.kind);
    }

    if (filters.itar !== undefined) {
      query = query.eq('itar_cui', filters.itar);
    }

    if (filters.preview_ready !== undefined) {
      query = query.eq('preview_ready', filters.preview_ready);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,tags.cs.{${filters.search}}`);
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo);
    }

    const { data } = await query.order('created_at', { ascending: false });
    return data || [];
  }

  async linkFileToObject(fileId: string, type: string, objectId: string, tags: string[] = []) {
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .select('linked_to')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new Error('File not found');
    }

    const updatedLinks = [
      ...file.linked_to,
      { type, id: objectId }
    ];

    const { data: updatedFile } = await this.supabase.client
      .from('file_meta')
      .update({
        linked_to: updatedLinks,
        tags: [...new Set([...(file.tags || []), ...tags])],
      })
      .eq('id', fileId)
      .select()
      .single();

    return updatedFile;
  }

  async unlinkFileFromObject(fileId: string, type: string, objectId: string) {
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .select('linked_to')
      .eq('id', fileId)
      .single();

    if (!file) {
      throw new Error('File not found');
    }

    const updatedLinks = file.linked_to.filter(
      link => !(link.type === type && link.id === objectId)
    );

    const { data: updatedFile } = await this.supabase.client
      .from('file_meta')
      .update({
        linked_to: updatedLinks,
      })
      .eq('id', fileId)
      .select()
      .single();

    return updatedFile;
  }

  async deleteFile(fileId: string, userId: string) {
    // Soft delete
    const { data: file } = await this.supabase.client
      .from('file_meta')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', fileId)
      .select()
      .single();

    return file;
  }

  // Bulk operations
  async bulkDownload(files: string[], userId: string) {
    // This would create a ZIP file and return a signed URL
    // Implementation depends on storage solution
    return { downloadUrl: 'signed-url-here' };
  }

  async bulkDelete(files: string[], userId: string) {
    const { data } = await this.supabase.client
      .from('file_meta')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .in('id', files)
      .select();

    return data;
  }

  async bulkTag(files: string[], tags: string[], userId: string) {
    // Get current tags for each file and merge
    const { data: filesData } = await this.supabase.client
      .from('file_meta')
      .select('id, tags')
      .in('id', files);

    const updates = filesData?.map(file => ({
      id: file.id,
      tags: [...new Set([...(file.tags || []), ...tags])],
    })) || [];

    for (const update of updates) {
      await this.supabase.client
        .from('file_meta')
        .update({ tags: update.tags })
        .eq('id', update.id);
    }

    return updates;
  }

  // Export methods
  async exportDocuments(orgId: string, filters: any = {}) {
    const [qapDocs, certs, fairReports, invoices] = await Promise.all([
      this.getQapDocuments(orgId, filters),
      this.getCertificates(orgId, filters),
      this.getFairReports(orgId, filters),
      this.getInvoices(orgId, filters),
    ]);

    return {
      qap_documents: qapDocs,
      certificates: certs,
      fair_reports: fairReports,
      invoices: invoices,
    };
  }

  async exportInvoices(orgId: string, filters: any = {}) {
    const invoices = await this.getInvoices(orgId, filters);
    return invoices;
  }
}
