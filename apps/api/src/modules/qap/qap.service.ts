import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as puppeteer from 'puppeteer';
import { join } from 'path';
import { createReadStream } from 'fs';

@Injectable()
export class QapService {
  private readonly logger = new Logger(QapService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue('qap') private readonly qapQueue: Queue,
  ) {}

  async createTemplate(data: {
    orgId: string;
    name: string;
    description?: string;
    templateHtml: string;
    schemaJson: any;
    processType: string;
    userId: string;
  }) {
    const { data: template } = await this.supabase.client
      .from('qap_templates')
      .insert({
        org_id: data.orgId,
        name: data.name,
        description: data.description,
        template_html: data.templateHtml,
        schema_json: data.schemaJson,
        process_type: data.processType,
        created_by: data.userId,
        updated_by: data.userId,
      })
      .select()
      .single();

    return template;
  }

  async updateTemplate(
    templateId: string,
    data: {
      name?: string;
      description?: string;
      templateHtml?: string;
      schemaJson?: any;
      processType?: string;
      userId: string;
    },
  ) {
    const { data: template } = await this.supabase.client
      .from('qap_templates')
      .update({
        ...data,
        updated_by: data.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    return template;
  }

  async getTemplate(templateId: string) {
    const { data: template } = await this.supabase.client
      .from('qap_templates')
      .select()
      .eq('id', templateId)
      .single();

    return template;
  }

  async getTemplates(orgId: string) {
    const { data: templates } = await this.supabase.client
      .from('qap_templates')
      .select()
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    return templates || [];
  }

  async generateQapDocument(data: {
    templateId: string;
    orderId: string;
    orderItemId: string;
    orgId: string;
    userId: string;
    documentData: any;
  }) {
    // Get template
    const template = await this.getTemplate(data.templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create QAP document record
    const { data: document } = await this.supabase.client
      .from('qap_documents')
      .insert({
        org_id: data.orgId,
        template_id: data.templateId,
        order_id: data.orderId,
        order_item_id: data.orderItemId,
        data: data.documentData,
        status: 'pending',
        file_path: '', // Will be updated after generation
        created_by: data.userId,
        updated_by: data.userId,
      })
      .select()
      .single();

    // Queue PDF generation
    await this.qapQueue.add(
      'generate-pdf',
      {
        documentId: document.id,
        templateHtml: template.template_html,
        documentData: data.documentData,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    return document;
  }

  async generatePdf(
    documentId: string,
    templateHtml: string,
    documentData: any,
  ) {
    try {
      // Launch browser
      const browser = await puppeteer.launch({
        args: ['--no-sandbox'],
      });
      const page = await browser.newPage();

      // Inject data into template
      const html = this.injectDataIntoTemplate(templateHtml, documentData);
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      await browser.close();

      // Upload to Supabase Storage
      const filePath = `qap/${documentId}.pdf`;
      const { error } = await this.supabase.client.storage
        .from('documents')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Update document record
      await this.supabase.client
        .from('qap_documents')
        .update({
          file_path: filePath,
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      return filePath;
    } catch (error) {
      this.logger.error('Error generating QAP PDF:', error);

      // Update document status to failed
      await this.supabase.client
        .from('qap_documents')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      throw error;
    }
  }

  private injectDataIntoTemplate(template: string, data: any): string {
    // Replace template variables with actual data
    let html = template;

    // Handle nested objects
    const flattenObject = (obj: any, prefix = '') => {
      return Object.keys(obj).reduce((acc: any, k: string) => {
        const pre = prefix.length ? prefix + '.' : '';
        if (
          typeof obj[k] === 'object' &&
          obj[k] !== null &&
          !Array.isArray(obj[k])
        ) {
          Object.assign(acc, flattenObject(obj[k], pre + k));
        } else {
          acc[pre + k] = obj[k];
        }
        return acc;
      }, {});
    };

    const flatData = flattenObject(data);

    // Replace all {{ variable }} occurrences
    Object.entries(flatData).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      html = html.replace(regex, String(value));
    });

    return html;
  }

  async getQapDocument(documentId: string) {
    const { data: document } = await this.supabase.client
      .from('qap_documents')
      .select(`
        *,
        template:qap_templates (
          name,
          process_type
        ),
        order:orders (
          id,
          customer:customers (
            name,
            email
          )
        ),
        order_item:order_items (
          id,
          quantity,
          status
        )
      `)
      .eq('id', documentId)
      .single();

    if (document?.file_path) {
      const { data } = await this.supabase.client.storage
        .from('documents')
        .createSignedUrl(document.file_path, 3600); // 1 hour expiry

      if (data) {
        document.download_url = data.signedUrl;
      }
    }

    return document;
  }

  async getOrderQapDocuments(orderId: string) {
    const { data: documents } = await this.supabase.client
      .from('qap_documents')
      .select(`
        *,
        template:qap_templates (
          name,
          process_type
        )
      `)
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    // Get signed URLs for all documents
    if (documents) {
      for (const doc of documents) {
        if (doc.file_path) {
          const { data } = await this.supabase.client.storage
            .from('documents')
            .createSignedUrl(doc.file_path, 3600);

          if (data) {
            doc.download_url = data.signedUrl;
          }
        }
      }
    }

    return documents || [];
  }
}
