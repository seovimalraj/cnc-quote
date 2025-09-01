import { z } from "zod";
import { ApiProperty } from "@nestjs/swagger";

export enum QapTemplateProcessType {
  CNC = "cnc",
  SHEET_METAL = "sheet_metal",
  INJECTION_MOLDING = "injection_molding",
  ADDITIVE = "additive",
}

export enum QapDocumentStatus {
  PENDING = "pending",
  GENERATING = "generating",
  COMPLETED = "completed",
  FAILED = "failed",
}

export const qapTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  templateHtml: z.string().min(1),
  schemaJson: z.record(z.unknown()),
  processType: z.nativeEnum(QapTemplateProcessType),
});

export class QapTemplateResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  org_id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty()
  templateHtml: string;

  @ApiProperty()
  schemaJson: Record<string, unknown>;

  @ApiProperty({ enum: QapTemplateProcessType })
  processType: QapTemplateProcessType;

  @ApiProperty()
  created_by: string;

  @ApiProperty()
  updated_by: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;
}

export type QapTemplate = z.infer<typeof qapTemplateSchema> & {
  id: string;
  org_id: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
};

export const qapDocumentSchema = z.object({
  templateId: z.string().uuid(),
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid(),
  documentData: z.record(z.unknown()),
});

export class QapDocumentResponse {
  @ApiProperty()
  id: string;

  @ApiProperty()
  org_id: string;

  @ApiProperty()
  template_id: string;

  @ApiProperty()
  order_id: string;

  @ApiProperty()
  order_item_id: string;

  @ApiProperty()
  data: Record<string, unknown>;

  @ApiProperty({ enum: QapDocumentStatus })
  status: QapDocumentStatus;

  @ApiProperty()
  file_path: string;

  @ApiProperty({ required: false })
  download_url?: string;

  @ApiProperty()
  created_by: string;

  @ApiProperty()
  updated_by: string;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  updated_at: string;

  @ApiProperty({ required: false })
  template?: {
    name: string;
    process_type: QapTemplateProcessType;
  };

  @ApiProperty({ required: false })
  order?: {
    id: string;
    customer: {
      name: string;
      email: string;
    };
  };

  @ApiProperty({ required: false })
  order_item?: {
    id: string;
    quantity: number;
    status: string;
  };
}

export type QapDocument = {
  id: string;
  org_id: string;
  template_id: string;
  order_id: string;
  order_item_id: string;
  data: Record<string, unknown>;
  status: QapDocumentStatus;
  file_path: string;
  download_url?: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  template?: {
    name: string;
    process_type: QapTemplateProcessType;
  };
  order?: {
    id: string;
    customer: {
      name: string;
      email: string;
    };
  };
  order_item?: {
    id: string;
    quantity: number;
    status: string;
  };
};
