export interface CadAnalysisResult {
  status: "processing" | "completed" | "failed";
  // CAD analysis specific fields
  features?: {
    type: string;
    count: number;
  }[];
  dimensions?: {
    width: number;
    height: number;
    depth: number;
  };
  complexity?: {
    score: number;
    factors: string[];
  };
  errors?: string[];
}

export interface CadPreviewResult {
  status: "processing" | "completed" | "failed";
  gltfUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface CadConversionRequest {
  task_id: string;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface CadJobData {
  fileId: string;
  downloadUrl?: string;
  taskId?: string;
}

export type CadJobType = "analyze" | "preview";
