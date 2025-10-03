import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../lib/supabase/supabase.service";
// Migrated to BullMQ (@nestjs/bullmq)
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import * as puppeteer from "puppeteer";
import { QapTemplate, QapDocument, QapDocumentStatus, QapTemplateProcessType, qapTemplateSchema, qapDocumentSchema } from "./qap.types";
import { QapTemplateSchema } from "./qap.types.schema";
import {
  QapInput as _QapInput,
  QapContext as _QapContext,
  QapGenerateOptions as _QapGenerateOptions,
} from "./qap.input";
import {
  QapDocumentInput,
  QapDocumentData,
  QapValidationResult as _QapValidationResult,
  QapPdfOptions as _QapPdfOptions,
} from "./qap.service.types";
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
    schemaJson: Record<string, unknown>;
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

  async generateQapDocument(data: QapDocumentInput): Promise<QapDocument> {
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

  private injectDataIntoTemplate(template: string, data: Record<string, unknown>): string {
    try {
      // Replace template variables with actual data
      let html = template;

      // Handle nested objects
      const flattenObject = (obj: Record<string, unknown>, prefix = ""): Record<string, unknown> => {
        return Object.keys(obj).reduce((acc: Record<string, unknown>, k: string) => {
          const pre = prefix.length ? prefix + "." : "";
          if (typeof obj[k] === "object" && obj[k] !== null && !Array.isArray(obj[k])) {
            Object.assign(acc, flattenObject(obj[k] as Record<string, unknown>, pre + k));
          } else {
            acc[pre + k] = obj[k];
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
      this.logger.error(`Error getting order QAP documents for order ${orderId}:`, error);
      throw new QapInvalidDataException(error.message);
    }
  }

  async generateDfmQapDocument(data: {
    dfmRequestId: string;
    criticality: string;
    industry: string;
    certifications?: string[];
    orgId: string;
    userId: string;
  }): Promise<QapDocument> {
    try {
      this.logger.log(`Generating DFM-based QAP document for request: ${data.dfmRequestId}`);

      // Get DFM request with results
      const { data: dfmRequest, error: dfmError } = await this.supabase.client
        .from('dfm_requests')
        .select(`
          *,
          file:files(*),
          results:dfm_results(*),
          organization:organizations(*),
          user:users(*)
        `)
        .eq('id', data.dfmRequestId)
        .single();

      if (dfmError || !dfmRequest) {
        throw new QapInvalidDataException('DFM request not found');
      }

      // Get appropriate template based on industry and criticality
      const template = await this.getDfmTemplate(data.industry, data.criticality);

      // Generate QAP data from DFM results
      const qapData = await this.generateDfmQapData(dfmRequest, data);

      // Create QAP document record
      const { data: document, error: docError } = await this.supabase.client
        .from('qap_documents')
        .insert({
          org_id: data.orgId,
          template_id: template.id,
          dfm_request_id: data.dfmRequestId,
          status: QapDocumentStatus.GENERATING,
          document_data: qapData,
          created_by: data.userId,
        })
        .select()
        .single();

      if (docError) {
        throw new QapGenerationFailedException('Failed to create QAP document record');
      }

      // Generate PDF asynchronously
      this.generateDfmQapPdf(document.id, template.templateHtml, qapData);

      return document;
    } catch (error) {
      this.logger.error(`Error generating DFM QAP document:`, error);
      throw error;
    }
  }

  private async getDfmTemplate(industry: string, criticality: string): Promise<QapTemplate> {
    // Select template based on industry and criticality
    // For now, use a default CNC template
    const { data: templates, error } = await this.supabase.client
      .from('qap_templates')
      .select('*')
      .eq('process_type', QapTemplateProcessType.CNC)
      .limit(1);

    if (error || !templates || templates.length === 0) {
      // Create a default template if none exists
      return await this.createDefaultQapTemplate();
    }

    return templates[0];
  }

  private async createDefaultQapTemplate(): Promise<QapTemplate> {
    const defaultTemplateHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Quality Assurance Plan - {{cover.partName}}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #333; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f5f5f5; }
        .signature-section { margin-top: 50px; }
        .signature-box { border: 1px solid #333; padding: 20px; width: 45%; display: inline-block; margin-right: 5%; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Quality Assurance Plan</h1>
        <h2>{{cover.partName}}</h2>
        <p><strong>Company:</strong> {{cover.company}}</p>
        <p><strong>Date:</strong> {{cover.date}}</p>
        <p><strong>DFM Request ID:</strong> {{cover.dfmRequestId}}</p>
    </div>

    <div class="section">
        <h2>Summary</h2>
        <p><strong>Criticality:</strong> {{summary.criticality}}</p>
        <p><strong>Industry:</strong> {{summary.industry}}</p>
        <p><strong>Certifications:</strong> {{summary.certifications}}</p>
        <p><strong>DFM Check Results:</strong> {{summary.checkCounts.pass}} Pass, {{summary.checkCounts.warning}} Warning, {{summary.checkCounts.fail}} Fail</p>
    </div>

    <div class="section">
        <h2>Critical DFM Findings</h2>
        <table>
            <tr><th>Check Name</th><th>Issue</th><th>Recommendation</th></tr>
            {{#each dfmFindings.criticalChecks}}
            <tr><td>{{this.name}}</td><td>{{this.issue}}</td><td>{{this.recommendation}}</td></tr>
            {{/each}}
        </table>
    </div>

    <div class="section">
        <h2>Quality Plan</h2>
        <p><strong>Inspection Methods:</strong> {{qualityPlan.inspectionMethods}}</p>
        <p><strong>Sampling Plan:</strong> {{qualityPlan.samplingPlan}}</p>
        <p><strong>Required Instruments:</strong> {{qualityPlan.instruments}}</p>
    </div>

    <div class="section">
        <h2>Process Controls</h2>
        <p><strong>Workholding:</strong> {{processControls.workholding}}</p>
        <p><strong>Tool Access:</strong> {{processControls.toolAccess}}</p>
        <p><strong>Coolant:</strong> {{processControls.coolant}}</p>
        <p><strong>Deburr:</strong> {{processControls.deburr}}</p>
        {{#if processControls.specialHandling}}
        <p><strong>Special Handling:</strong> {{processControls.specialHandling}}</p>
        {{/if}}
    </div>

    <div class="section">
        <h2>Acceptance Criteria</h2>
        <p><strong>Tolerance Pack:</strong> {{acceptanceCriteria.tolerancePack}}</p>
        <p><strong>Surface Roughness:</strong> {{acceptanceCriteria.surfaceRoughness}}</p>
        <p><strong>Dimensional Tolerance:</strong> {{acceptanceCriteria.dimensionalTolerance}}</p>
    </div>

    {{#if measurementPlan}}
    <div class="section">
        <h2>Measurement Plan</h2>
        <p><strong>Method:</strong> {{measurementPlan.method}}</p>
        <p><strong>Frequency:</strong> {{measurementPlan.frequency}}</p>
        <p><strong>Instruments:</strong> {{measurementPlan.instruments}}</p>
    </div>
    {{/if}}

    <div class="signature-section">
        <div class="signature-box">
            <h3>Supplier Signature</h3>
            <p>Name: {{signOff.supplierSignature.name}}</p>
            <p>Title: {{signOff.supplierSignature.title}}</p>
            <p>Company: {{signOff.supplierSignature.company}}</p>
            <p>Date: {{signOff.supplierSignature.date}}</p>
        </div>
        <div class="signature-box">
            <h3>Customer Signature</h3>
            <p>Name: {{signOff.customerSignature.name}}</p>
            <p>Title: {{signOff.customerSignature.title}}</p>
            <p>Company: {{signOff.customerSignature.company}}</p>
            <p>Date: {{signOff.customerSignature.date}}</p>
        </div>
    </div>
</body>
</html>`;

    const { data: template, error } = await this.supabase.client
      .from('qap_templates')
      .insert({
        name: 'Default CNC QAP Template',
        description: 'Default template for CNC machining QAP documents',
        template_html: defaultTemplateHtml,
        schema_json: {},
        process_type: QapTemplateProcessType.CNC,
        org_id: '00000000-0000-0000-0000-000000000000', // System org
        created_by: '00000000-0000-0000-0000-000000000000', // System user
        updated_by: '00000000-0000-0000-0000-000000000000', // System user
      })
      .select()
      .single();

    if (error) {
      throw new QapTemplateNotFoundException('Failed to create default QAP template');
    }

    return template;
  }

  private async generateDfmQapData(dfmRequest: any, options: any): Promise<QapDocumentData> {
    const dfmResults = dfmRequest.results || [];
    const checks = dfmResults.checks || [];

    // Count check statuses
    const checkCounts = {
      pass: checks.filter(c => c.status === 'pass').length,
      warning: checks.filter(c => c.status === 'warning').length,
      fail: checks.filter(c => c.status === 'fail').length,
    };

    // Get critical checks (warnings and failures)
    const criticalChecks = checks.filter(c => c.status === 'warning' || c.status === 'fail');

    // Generate inspection methods based on criticality
    const inspectionMethods = this.getInspectionMethods(options.criticality, options.certifications);

    // Generate process controls based on DFM findings
    const processControls = this.generateProcessControls(criticalChecks);

    // Generate measurement plan if non-standard tolerance
    const measurementPlan = dfmRequest.tolerance_pack !== 'standard' ?
      this.generateMeasurementPlan(dfmRequest.tolerance_pack) : null;

    return {
      // Cover page data
      cover: {
        partName: dfmRequest.file_name || 'Unknown Part',
        company: dfmRequest.organization?.name || 'Unknown Company',
        date: new Date().toISOString().split('T')[0],
        dfmRequestId: dfmRequest.id,
      },

      // Summary data
      summary: {
        criticality: options.criticality,
        industry: options.industry,
        certifications: options.certifications || [],
        checkCounts,
      },

      // DFM findings
      dfmFindings: {
        checks: checks.map(check => ({
          id: check.id,
          name: check.name,
          status: check.status,
          message: check.message,
          category: check.category,
          severity: check.severity,
        })),
        criticalChecks: criticalChecks.map(check => ({
          name: check.name,
          issue: check.message,
          recommendation: check.recommendation || 'Review and address this issue',
        })),
      },

      // Quality plan
      qualityPlan: {
        inspectionMethods,
        samplingPlan: this.getSamplingPlan(options.criticality),
        instruments: this.getRequiredInstruments(criticalChecks),
      },

      // Process controls
      processControls,

      // Material and finish controls
      materialControls: {
        traceability: this.getTraceabilityRequirements(options.certifications),
        finishSpec: dfmRequest.surface_finish,
        capacityNotes: this.getCapacityNotes(dfmRequest),
      },

      // Acceptance criteria
      acceptanceCriteria: {
        tolerancePack: dfmRequest.tolerance_pack,
        surfaceRoughness: dfmRequest.surface_finish,
        dimensionalTolerance: this.getDimensionalTolerance(dfmRequest.tolerance_pack),
      },

      // Measurement plan (if applicable)
      ...(measurementPlan && { measurementPlan }),

      // Sign-off sections
      signOff: {
        supplierSignature: {
          name: '',
          title: '',
          date: '',
          company: dfmRequest.organization?.name || '',
        },
        customerSignature: {
          name: '',
          title: '',
          date: '',
          company: '', // To be filled by customer
        },
      },
    };
  }

  private getInspectionMethods(criticality: string, certifications?: string[]): string[] {
    const methods = ['Visual Inspection', 'Dimensional Inspection'];

    // Add methods based on criticality
    if (['high', 'critical', 'aerospace', 'medical'].includes(criticality.toLowerCase())) {
      methods.push('CMM Inspection', 'Formal Documentation');
    }

    // Add methods based on certifications
    if (certifications?.includes('AS9100')) {
      methods.push('FAIR (First Article Inspection Report)');
    }

    if (certifications?.includes('ISO9001')) {
      methods.push('Statistical Process Control');
    }

    return methods;
  }

  private generateProcessControls(criticalChecks: any[]): any {
    const controls = {
      workholding: 'Standard vise/clamping - verify part stability',
      toolAccess: 'Standard tool access - verify clearance',
      coolant: 'Standard coolant application',
      deburr: 'Manual deburring required',
      specialHandling: [],
    };

    // Add special handling based on critical checks
    criticalChecks.forEach(check => {
      if (check.name.toLowerCase().includes('thin') || check.name.toLowerCase().includes('web')) {
        controls.specialHandling.push('Special handling required for thin features');
      }
      if (check.name.toLowerCase().includes('hole') && check.name.toLowerCase().includes('deep')) {
        controls.specialHandling.push('Peck drilling required for deep holes');
      }
      if (check.name.toLowerCase().includes('undercut')) {
        controls.specialHandling.push('Special tooling required for undercuts');
      }
    });

    return controls;
  }

  private generateMeasurementPlan(tolerancePack: string): any {
    const plans = {
      standard: {
        method: 'Standard measurement tools',
        frequency: 'First article + random sampling',
        instruments: ['Calipers', 'Micrometers', 'Height gauge'],
      },
      precision: {
        method: 'Precision measurement tools',
        frequency: '100% inspection',
        instruments: ['CMM', 'Precision micrometers', 'Optical comparator'],
      },
      tight: {
        method: 'High-precision measurement',
        frequency: '100% inspection with documentation',
        instruments: ['CMM', 'Laser measurement', 'Temperature-controlled environment'],
      },
    };

    return plans[tolerancePack.toLowerCase()] || plans.standard;
  }

  private getSamplingPlan(criticality: string): string {
    switch (criticality.toLowerCase()) {
      case 'low':
        return 'AQL 2.5 - Level II';
      case 'medium':
        return 'AQL 1.5 - Level II';
      case 'high':
      case 'critical':
      case 'aerospace':
      case 'medical':
        return '100% inspection';
      default:
        return 'AQL 2.5 - Level II';
    }
  }

  private getRequiredInstruments(criticalChecks: any[]): string[] {
    const instruments = ['Calipers', 'Micrometers'];

    // Add instruments based on critical checks
    if (criticalChecks.some(c => c.name.toLowerCase().includes('hole'))) {
      instruments.push('Pin gauges', 'Bore gauges');
    }
    if (criticalChecks.some(c => c.name.toLowerCase().includes('surface'))) {
      instruments.push('Surface roughness tester');
    }
    if (criticalChecks.some(c => c.name.toLowerCase().includes('thread'))) {
      instruments.push('Thread gauges');
    }

    return [...new Set(instruments)]; // Remove duplicates
  }

  private getTraceabilityRequirements(certifications?: string[]): string {
    if (certifications?.includes('AS9100') || certifications?.includes('ISO9001')) {
      return 'Full material traceability required - certificate of conformance and material certifications';
    }
    return 'Basic material traceability - supplier certification';
  }

  private getCapacityNotes(dfmRequest: any): string {
    const notes = [];

    if (dfmRequest.surface_finish === 'mirror') {
      notes.push('Mirror finish requires specialized polishing equipment');
    }
    if (dfmRequest.tolerance_pack === 'tight') {
      notes.push('Tight tolerances may require multiple setup operations');
    }

    return notes.join('; ');
  }

  private getDimensionalTolerance(tolerancePack: string): string {
    const tolerances = {
      standard: '±0.005" (0.127mm)',
      precision: '±0.002" (0.051mm)',
      tight: '±0.001" (0.025mm)',
    };

    return tolerances[tolerancePack.toLowerCase()] || tolerances.standard;
  }

  private async generateDfmQapPdf(documentId: string, templateHtml: string, documentData: QapDocumentData): Promise<void> {
    try {
      // Generate PDF using Puppeteer
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      // Render template with data
      const html = this.renderTemplate(templateHtml, documentData);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in',
        },
      });

      await browser.close();

      // Upload PDF to storage
      const fileName = `qap-${documentId}.pdf`;
      const { data: uploadData, error: uploadError } = await this.supabase.client.storage
        .from('documents')
        .upload(fileName, pdfBuffer, {
          contentType: 'application/pdf',
        });

      if (uploadError) {
        throw new QapUploadFailedException('Failed to upload QAP PDF');
      }

      // Get signed URL
      const { data: urlData } = await this.supabase.client.storage
        .from('documents')
        .createSignedUrl(fileName, 3600); // 1 hour expiry

      // Update document record
      const { error: updateError } = await this.supabase.client
        .from('qap_documents')
        .update({
          status: QapDocumentStatus.COMPLETED,
          file_path: fileName,
          download_url: urlData.signedUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', documentId);

      if (updateError) {
        throw new QapGenerationFailedException('Failed to update QAP document');
      }

      this.logger.log(`DFM QAP PDF generated successfully: ${documentId}`);
    } catch (error) {
      this.logger.error(`Error generating DFM QAP PDF:`, error);

      // Update document status to failed
      await this.supabase.client
        .from('qap_documents')
        .update({
          status: QapDocumentStatus.FAILED,
          error_message: error.message,
        })
        .eq('id', documentId);
    }
  }

  private renderTemplate(templateHtml: string, data: QapDocumentData): string {
    // Simple template rendering - replace {{variable}} with data
    let html = templateHtml;

    // Flatten data object for easy replacement
    const flattenData = (obj: any, prefix = ''): Record<string, any> => {
      const result: Record<string, any> = {};
      for (const [key, value] of Object.entries(obj)) {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          Object.assign(result, flattenData(value, newKey));
        } else {
          result[newKey] = value;
        }
      }
      return result;
    };

    const flatData = flattenData(data);

    // Replace simple variables
    for (const [key, value] of Object.entries(flatData)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value || ''));
    }

    // Handle array rendering for critical checks
    if (data.dfmFindings?.criticalChecks) {
      let criticalChecksHtml = '';
      data.dfmFindings.criticalChecks.forEach(check => {
        criticalChecksHtml += `<tr><td>${check.name}</td><td>${check.issue}</td><td>${check.recommendation}</td></tr>`;
      });
      html = html.replace(/{{#each dfmFindings\.criticalChecks}}.*?{{\/each}}/gs, criticalChecksHtml);
    }

    // Handle conditional sections
    html = html.replace(/{{#if measurementPlan}}([\s\S]*?){{\/if}}/g, data.measurementPlan ? '$1' : '');
    html = html.replace(/{{#if processControls\.specialHandling}}([\s\S]*?){{\/if}}/g,
      data.processControls?.specialHandling?.length ? '$1' : '');

    return html;
  }
}
