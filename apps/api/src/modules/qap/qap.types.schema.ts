export interface QapSchemaField {
  type: string;
  title?: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  format?: string;
  pattern?: string;
  required?: boolean;
  properties?: Record<string, QapSchemaField>;
  items?: QapSchemaField | QapSchemaField[];
}

export interface QapTemplateSchema {
  type: "object";
  properties: Record<string, QapSchemaField>;
  required?: string[];
}

export interface QapDocumentData {
  [key: string]: string | number | boolean | QapDocumentData;
}
