import { UploadPresignSchema, UploadSpecSchema, type UploadSpec } from '@cnc-quote/shared/contracts/vnext';
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';

const badRequest = (message: string): Response =>
  new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'content-type': 'application/json' },
  });

const normalizeSpec = (spec: UploadSpec) => {
  const size = spec.size ?? spec.byteLength;
  const byteLength = spec.byteLength ?? spec.size;
  return {
    ...spec,
    ...(size !== undefined ? { size } : {}),
    ...(byteLength !== undefined ? { byteLength } : {}),
  };
};

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : 'Invalid JSON payload');
  }

  const parseResult = UploadSpecSchema.safeParse(payload);
  if (!parseResult.success) {
    return badRequest('Upload specification failed validation');
  }

  const normalized = normalizeSpec(parseResult.data);

  // Directly create a signed upload URL using Supabase Storage to avoid backend dependency for presign
  const supabase = await createClient();

  const fileId = normalized.fileId || uuidv4();
  const fileName = normalized.fileName || `${fileId}`;
  const path = `instant-quote/${fileId}/${fileName}`;

  const { data: signedUrlData, error } = await supabase.storage
    .from('cad-files')
    .createSignedUploadUrl(path, 3600);

  if (error || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });
  }

  // Conform to UploadPresignSchema
  const response = {
    url: signedUrlData.signedUrl,
    method: 'POST' as const,
    fileId,
    metadata: { path: signedUrlData.path },
  };

  return NextResponse.json(UploadPresignSchema.parse(response));
}
