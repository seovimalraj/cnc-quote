import { z } from 'zod';

// CAD Analysis Request Schema
export const CadAnalysisRequestSchema = z.object({
  file_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  options: z.object({
    include_mesh: z.boolean().default(true),
    include_features: z.boolean().default(true),
    include_dimensions: z.boolean().default(true),
    include_complexity: z.boolean().default(true),
    decimation_factor: z.number().min(0.1).max(1).default(0.5),
  }).optional(),
});

// CAD Analysis Result Schema
export const CadAnalysisResultSchema = z.object({
  task_id: z.string().uuid(),
  file_id: z.string().uuid(),
  status: z.enum(['Queued', 'Processing', 'Succeeded', 'Failed']),
  features: z.object({
    volume_cc: z.number().optional(),
    surface_area_cm2: z.number().optional(),
    bounding_box: z.object({
      x: z.number(),
      y: z.number(),
      z: z.number(),
    }).optional(),
    holes: z.number().optional(),
    pockets: z.number().optional(),
    slots: z.number().optional(),
    faces: z.number().optional(),
    edges: z.number().optional(),
    vertices: z.number().optional(),
  }).optional(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
    depth: z.number(),
    diagonal: z.number(),
  }).optional(),
  complexity: z.object({
    score: z.number().min(0).max(100),
    factors: z.array(z.string()),
    processing_time_ms: z.number(),
  }).optional(),
  mesh: z.object({
    vertices: z.number(),
    faces: z.number(),
    url: z.string().url(),
    thumbnail_url: z.string().url().optional(),
  }).optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  processing_started_at: z.string().datetime().optional(),
  processing_completed_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// CAD Preview Request Schema
export const CadPreviewRequestSchema = z.object({
  file_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  format: z.enum(['gltf', 'obj', 'stl']).default('gltf'),
  quality: z.enum(['low', 'medium', 'high']).default('medium'),
  include_materials: z.boolean().default(true),
  include_textures: z.boolean().default(false),
});

// CAD Preview Result Schema
export const CadPreviewResultSchema = z.object({
  task_id: z.string().uuid(),
  file_id: z.string().uuid(),
  status: z.enum(['Queued', 'Processing', 'Succeeded', 'Failed']),
  format: z.string(),
  quality: z.string(),
  url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  file_size_bytes: z.number().optional(),
  error_code: z.string().optional(),
  error_message: z.string().optional(),
  processing_started_at: z.string().datetime().optional(),
  processing_completed_at: z.string().datetime().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

// CAD Task Status Schema
export const CadTaskStatusSchema = z.object({
  task_id: z.string().uuid(),
  status: z.enum(['Queued', 'Processing', 'Succeeded', 'Failed']),
  progress: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
  estimated_completion: z.string().datetime().optional(),
});

// CAD Feature Extraction Schema
export const CadFeatureSchema = z.object({
  type: z.enum(['hole', 'pocket', 'slot', 'face', 'edge', 'vertex', 'fillet', 'chamfer']),
  count: z.number(),
  dimensions: z.object({
    diameter: z.number().optional(),
    depth: z.number().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    angle: z.number().optional(),
  }).optional(),
  positions: z.array(z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  })).optional(),
});

// CAD Complexity Analysis Schema
export const CadComplexitySchema = z.object({
  overall_score: z.number().min(0).max(100),
  factors: z.array(z.object({
    name: z.string(),
    score: z.number().min(0).max(100),
    weight: z.number().min(0).max(1),
    description: z.string(),
  })),
  recommendations: z.array(z.string()).optional(),
  processing_time_ms: z.number(),
});

// CAD Mesh Schema
export const CadMeshSchema = z.object({
  format: z.enum(['gltf', 'obj', 'stl']),
  vertices_count: z.number(),
  faces_count: z.number(),
  triangles_count: z.number(),
  url: z.string().url(),
  thumbnail_url: z.string().url().optional(),
  file_size_bytes: z.number(),
  bounding_box: z.object({
    min: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    max: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  }),
});

// CAD Error Codes
export const CadErrorCodes = {
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  CORRUPTED_FILE: 'CORRUPTED_FILE',
  UNSUPPORTED_VERSION: 'UNSUPPORTED_VERSION',
  GEOMETRY_TOO_COMPLEX: 'GEOMETRY_TOO_COMPLEX',
  PROCESSING_TIMEOUT: 'PROCESSING_TIMEOUT',
  STORAGE_ERROR: 'STORAGE_ERROR',
  PARSING_ERROR: 'PARSING_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
} as const;

export type CadErrorCode = typeof CadErrorCodes[keyof typeof CadErrorCodes];

// Type exports
export type CadAnalysisRequest = z.infer<typeof CadAnalysisRequestSchema>;
export type CadAnalysisResult = z.infer<typeof CadAnalysisResultSchema>;
export type CadPreviewRequest = z.infer<typeof CadPreviewRequestSchema>;
export type CadPreviewResult = z.infer<typeof CadPreviewResultSchema>;
export type CadTaskStatus = z.infer<typeof CadTaskStatusSchema>;
export type CadFeature = z.infer<typeof CadFeatureSchema>;
export type CadComplexity = z.infer<typeof CadComplexitySchema>;
export type CadMesh = z.infer<typeof CadMeshSchema>;

// Legacy interface for backward compatibility
export interface CadAnalysisResultLegacy {
  status: "processing" | "completed" | "failed";
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

export interface CadPreviewResultLegacy {
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
