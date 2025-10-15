import { z } from 'zod';

export const UploadSpecSchema = z
  .object({
    fileId: z.string().optional(),
    fileName: z.string(),
    contentType: z.string().optional(),
    byteLength: z.number().int().nonnegative().optional(),
    size: z.number().int().nonnegative().optional(),
    checksum: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const UploadPresignSchema = z
  .object({
    url: z.string().url(),
    method: z.enum(['PUT', 'POST']).optional(),
    fields: z.record(z.string(), z.string()).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    expiresAt: z.string().optional(),
    fileId: z.string().optional(),
    uploadId: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export type UploadSpec = z.infer<typeof UploadSpecSchema>;
export type UploadPresign = z.infer<typeof UploadPresignSchema>;