import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import * as puppeteer from "puppeteer";
import { QapTemplate, QapDocument, QapDocumentStatus, qapTemplateSchema, qapDocumentSchema } from "./qap.types";
import { QapTemplateSchema, QapDocumentData } from "./qap.types.schema";
import {
  QapTemplateNotFoundException,
  QapDocumentNotFoundException,
  QapGenerationFailedException,
  QapUploadFailedException,
  QapInvalidDataException,
} from "./qap.errors";

@Injectable()
export class QapService {
  private readonly logger = new Logger(QapService.name);

  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue("qap") private readonly qapQueue: Queue,
  ) {}

  async createTemplate(data: {
    orgId: string;
    name: string;
    description?: string;
    templateHtml: string;
    schemaJson: QapTemplateSchema;
    processType: string;
    userId: string;
  }): Promise<QapTemplate> {
    try {
      // Validate template data
      const validatedData = qapTemplateSchema.parse({
        name: data.name,
        description: data.description,
        templateHtml: data.templateHtml,
        schemaJson: data.schemaJson,
        processType: data.processType,
      });

      // Create template
      const { data: template, error } = await this.supabase.client
        .from("qap_templates")
        .insert({
          org_id: data.orgId,
          ...validatedData,
          created_by: data.userId,
          updated_by: data.userId,
        })
        .select()
        .single();

      if (error) throw error;
      if (!template) throw new QapInvalidDataException("Failed to create template");

      return template;
    } catch (error) {
      this.logger.error("Error creating QAP template:", error);
      if (error instanceof QapInvalidDataException) throw error;
      throw new QapInvalidDataException(error.message);
    }
  }

  async updateTemplate(
    templateId: string,
    data: {
      name?: string;
      description?: string;
      templateHtml?: string;
      schemaJson?: QapTemplateSchema;
      processType?: string;
      userId: string;
    },
  ): Promise<QapTemplate> {
    try {
      // Get existing template
      const existing = await this.getTemplate(templateId);
      if (!existing) throw new QapTemplateNotFoundException(templateId);

      // Validate update data
      const updateData = {
        name: data.name ?? existing.name,
        description: data.description ?? existing.description,
        templateHtml: data.templateHtml ?? existing.templateHtml,
        schemaJson: data.schemaJson ?? existing.schemaJson,
        processType: data.processType ?? existing.processType,
      };

      const validatedData = qapTemplateSchema.parse(updateData);

      // Update template
      const { data: template, error } = await this.supabase.client
        .from("qap_templates")
        .update({
          ...validatedData,
          updated_by: data.userId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId)
        .select()
        .single();

      if (error) throw error;
      if (!template) throw new QapTemplateNotFoundException(templateId);

      return template;
    } catch (error) {
      this.logger.error(`Error updating QAP template ${templateId}:`, error);
      if (error instanceof QapTemplateNotFoundException) throw error;
      if (error instanceof QapInvalidDataException) throw error;
      throw new QapInvalidDataException(error.message);
    }
  }

  async getTemplate(templateId: string): Promise<QapTemplate> {
    const { data: template, error } = await this.supabase.client
      .from("qap_templates")
      .select()
      .eq("id", templateId)
      .single();

    if (error) throw new QapTemplateNotFoundException(templateId);
    if (!template) throw new QapTemplateNotFoundException(templateId);

    return template;
  }

  async getTemplates(orgId: string): Promise<QapTemplate[]> {
    const { data: templates, error } = await this.supabase.client
      .from("qap_templates")
      .select()
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return templates || [];
  }

  async generateQapDocument(data: {
    templateId: string;
    orderId: string;
    orderItemId?: string | null;
    orgId: string;
    userId: string;
    documentData: QapDocumentData;
  }): Promise<QapDocument> {
    try {
      // Validate input data
      const validatedData = qapDocumentSchema.parse({
        templateId: data.templateId,
        orderId: data.orderId,
        orderItemId: data.orderItemId,
        documentData: data.documentData,
      });

      // Get template
      const template = await this.getTemplate(validatedData.templateId);

      // Create QAP document record
      const { data: document, error: createError } = await this.supabase.client
        .from("qap_documents")
        .insert({
          org_id: data.orgId,
          template_id: validatedData.templateId,
          order_id: validatedData.orderId,
          order_item_id: validatedData.orderItemId ?? null,
          data: validatedData.documentData,
          status: QapDocumentStatus.PENDING,
          file_path: "",
          created_by: data.userId,
          updated_by: data.userId,
        })
        .select()
        .single();

      if (createError) throw createError;
      if (!document) throw new QapInvalidDataException("Failed to create QAP document");

      // Queue PDF generation
      await this.qapQueue.add(
        "generate-pdf",
        {
          documentId: document.id,
          templateHtml: template.templateHtml,
          documentData: validatedData.documentData,
        },
        {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 2000,
          },
        },
      );

      return document;
    } catch (error) {
      this.logger.error("Error generating QAP document:", error);
      if (error instanceof QapTemplateNotFoundException) throw error;
      if (error instanceof QapInvalidDataException) throw error;
      throw new QapGenerationFailedException(error.message);
    }
  }

  async generatePdf(documentId: string, templateHtml: string, documentData: QapDocumentData): Promise<string> {
    try {
      // Update document status to generating
      await this.supabase.client
        .from("qap_documents")
        .update({
          status: QapDocumentStatus.GENERATING,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      // Launch browser
      const browser = await puppeteer.launch({
        args: ["--no-sandbox"],
      });

      try {
        const page = await browser.newPage();

        // Inject data into template
        const html = this.injectDataIntoTemplate(templateHtml, documentData);
        await page.setContent(html, {
          waitUntil: "networkidle0",
        });

        // Generate PDF
        const pdfBuffer = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: {
            top: "20mm",
            right: "20mm",
            bottom: "20mm",
            left: "20mm",
          },
        });

        // Upload to Supabase Storage
        const filePath = `qap/${documentId}.pdf`;
        const { error: uploadError } = await this.supabase.client.storage
          .from("documents")
          .upload(filePath, pdfBuffer, {
            contentType: "application/pdf",
            upsert: true,
          });

        if (uploadError) throw new QapUploadFailedException(uploadError.message);

        // Update document record
        const { error: updateError } = await this.supabase.client
          .from("qap_documents")
          .update({
            file_path: filePath,
            status: QapDocumentStatus.COMPLETED,
            updated_at: new Date().toISOString(),
          })
          .eq("id", documentId);

        if (updateError) throw updateError;

        return filePath;
      } finally {
        await browser.close();
      }
    } catch (error) {
      this.logger.error("Error generating QAP PDF:", error);

      // Update document status to failed
      await this.supabase.client
        .from("qap_documents")
        .update({
          status: QapDocumentStatus.FAILED,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      throw new QapGenerationFailedException(error.message);
    }
  }

  private injectDataIntoTemplate(template: string, data: QapDocumentData): string {
    try {
      // Replace template variables with actual data
      let html = template;

      // Handle nested objects
      const flattenObject = (obj: QapDocumentData, prefix = ""): Record<string, string | number | boolean> => {
        return Object.keys(obj).reduce((acc: Record<string, string | number | boolean>, k: string) => {
          const pre = prefix.length ? prefix + "." : "";
          if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k], pre + k));
          } else {
            const value = obj[k];
            if (typeof value === "object") {
              Object.assign(acc, flattenObject(value as QapDocumentData, pre + k));
            } else {
              acc[pre + k] = value as string | number | boolean;
            }
          }
          return acc;
        }, {});
      };

      const flatData = flattenObject(data);

      // Replace all {{ variable }} occurrences
      Object.entries(flatData).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
        html = html.replace(regex, String(value));
      });

      return html;
    } catch (error) {
      throw new QapInvalidDataException("Failed to inject data into template");
    }
  }

  async getQapDocument(documentId: string): Promise<QapDocument> {
    try {
      const { data: document, error } = await this.supabase.client
        .from("qap_documents")
        .select(
          `
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
        `,
        )
        .eq("id", documentId)
        .single();

      if (error || !document) throw new QapDocumentNotFoundException(documentId);

      if (document?.file_path) {
        const { data: urlData, error: urlError } = await this.supabase.client.storage
          .from("documents")
          .createSignedUrl(document.file_path, 3600); // 1 hour expiry

        if (!urlError && urlData) {
          document.download_url = urlData.signedUrl;
        }
      }

      return document;
    } catch (error) {
      this.logger.error(`Error getting QAP document ${documentId}:`, error);
      if (error instanceof QapDocumentNotFoundException) throw error;
      throw new QapInvalidDataException(error.message);
    }
  }

  async getOrderQapDocuments(orderId: string): Promise<QapDocument[]> {
    try {
      const { data: documents, error } = await this.supabase.client
        .from("qap_documents")
        .select(
          `
          *,
          template:qap_templates (
            name,
            process_type
          )
        `,
        )
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Get signed URLs for all documents
      if (documents) {
        await Promise.all(
          documents.map(async (doc) => {
            if (doc.file_path) {
              const { data: urlData, error: urlError } = await this.supabase.client.storage
                .from("documents")
                .createSignedUrl(doc.file_path, 3600);

              if (!urlError && urlData) {
                doc.download_url = urlData.signedUrl;
              }
            }
            return doc;
          }),
        );
      }

      return documents || [];
    } catch (error) {
      this.logger.error(`Error getting QAP documents for order ${orderId}:`, error);
      throw new QapInvalidDataException(error.message);
    }
  }
}
