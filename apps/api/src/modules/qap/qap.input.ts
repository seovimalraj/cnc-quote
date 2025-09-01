import { QapTemplate, QapDocument, QapDocumentStatus } from '@cnc-quote/shared';

export interface QapInput {
  orgId: string;
  userId: string;
  templateData?: {
    name: string;
    description?: string;
    templateHtml: string;
    schemaJson: Record<string, unknown>;
    processType: string;
  };
  documentData?: {
    templateId: string;
    orderId: string;
    orderItemId: string;
    documentData: Record<string, unknown>;
  };
}

export interface QapContext {
  orgId: string;
  userId: string;
}

export interface QapGenerateOptions {
  template: QapTemplate;
  data: Record<string, unknown>;
  options?: {
    fonts?: Record<string, Buffer>;
    logo?: Buffer;
    footer?: string;
  };
}
