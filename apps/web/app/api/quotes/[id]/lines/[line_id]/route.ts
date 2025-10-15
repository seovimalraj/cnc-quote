import { NextRequest } from 'next/server';
import { z } from 'zod';

import { CATALOG_SNAPSHOT } from '@cnc-quote/shared';

import { buildProxyResponse, resolveApiUrl } from '@/app/api/_lib/backend';
import { proxyFetch } from '@/app/api/_lib/proxyFetch';

const materialLookup = CATALOG_SNAPSHOT.materials.reduce<Map<string, string>>((map, item) => {
  map.set(item.name.toLowerCase(), item.id);
  map.set(item.code.toLowerCase(), item.id);
  return map;
}, new Map());

const finishLookup = CATALOG_SNAPSHOT.finishes?.reduce<Map<string, string>>((map, item) => {
  map.set(item.name.toLowerCase(), item.id);
  map.set(item.code.toLowerCase(), item.id);
  return map;
}, new Map()) ?? new Map();

const UpdateLineSchema = z
  .object({
    quantity: z.number().int().positive().optional(),
    process: z.string().optional(),
    material: z.string().optional(),
    finish: z.string().optional(),
    threadsInserts: z.string().optional(),
    tolerancePack: z.string().optional(),
    surfaceRoughness: z.string().optional(),
    inspection: z.string().optional(),
    certificates: z.array(z.string()).optional(),
    notes: z.string().optional(),
  })
  .catchall(z.unknown());

const processMap: Record<string, string> = {
  cnc: 'cnc_milling',
  sheetmetal: 'sheet_metal',
  'sheet_metal': 'sheet_metal',
  injectionmolding: 'cnc_milling',
};

const toleranceMap: Record<string, string> = {
  std: 'standard',
  tight: 'precision',
  critical: 'high',
};

const inspectionMap: Record<string, string> = {
  std: 'basic',
  formal: 'enhanced',
  cmm: 'full',
  fair: 'full',
  source: 'full',
  custom: 'full',
};

const surfaceMap: Record<string, string> = {
  '125': 'standard',
  '63': 'improved',
  '32': 'fine',
};

const normalizeKey = (value?: string) => value?.trim().toLowerCase();

const mapProcessType = (value?: string) => {
  const key = normalizeKey(value);
  if (!key) return undefined;
  return processMap[key] ?? 'cnc_milling';
};

const mapMaterialId = (value?: string) => {
  const key = normalizeKey(value);
  if (!key) return undefined;
  return materialLookup.get(key);
};

const mapFinishIds = (value?: string) => {
  const key = normalizeKey(value);
  if (!key) return undefined;
  const id = finishLookup.get(key);
  return id ? [id] : undefined;
};

const mapToleranceClass = (value?: string) => {
  const key = normalizeKey(value);
  if (!key) return undefined;
  return toleranceMap[key] ?? undefined;
};

const mapInspectionLevel = (value?: string) => {
  const key = normalizeKey(value);
  if (!key) return undefined;
  return inspectionMap[key] ?? undefined;
};

const mapSurfaceFinish = (value?: string) => {
  const key = normalizeKey(value);
  if (!key) return undefined;
  return surfaceMap[key] ?? 'standard';
};

const buildErrorResponse = (message: string, status = 400) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const buildUpdatePayload = (specs: z.infer<typeof UpdateLineSchema>) => {
  const update: Record<string, unknown> = {};

  if (typeof specs.quantity === 'number') {
    update.quantities = [specs.quantity];
    update.selected_quantity = specs.quantity;
  }

  const process = mapProcessType(specs.process);
  if (process) update.process_type = process;

  const materialId = mapMaterialId(specs.material);
  if (materialId) update.material_id = materialId;
  else if (specs.material) update.material_spec = specs.material;

  const finishIds = mapFinishIds(specs.finish);
  if (finishIds) update.finish_ids = finishIds;

  const tolerance = mapToleranceClass(specs.tolerancePack);
  if (tolerance) update.tolerance_class = tolerance;

  const inspection = mapInspectionLevel(specs.inspection);
  if (inspection) update.inspection_level = inspection;

  const surface = mapSurfaceFinish(specs.surfaceRoughness);
  if (surface) update.surface_finish = surface;

  const secondaryOps = collectSecondaryOperations(specs);
  if (secondaryOps) update.secondary_operations = secondaryOps;

  if (specs.notes?.trim()) update.special_instructions = specs.notes;

  update.ui_specs_snapshot = specs;
  return update;
};

const collectSecondaryOperations = (specs: z.infer<typeof UpdateLineSchema>) => {
  const ops = new Set<string>();
  if (specs.threadsInserts?.trim()) ops.add('threading');
  specs.certificates?.forEach((certificate) => {
    const normalized = normalizeKey(certificate);
    if (normalized) ops.add(`cert_${normalized.replace(/[^a-z0-9]+/g, '_')}`);
  });
  return ops.size > 0 ? Array.from(ops) : undefined;
};

export async function PUT(
  request: NextRequest,
  context: { params: { id: string; line_id: string } },
) {
  let parsed: z.infer<typeof UpdateLineSchema>;

  try {
    const body = await request.json();
    parsed = UpdateLineSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => issue.message).join('; ');
      return buildErrorResponse(issues);
    }
    return buildErrorResponse('Invalid JSON payload');
  }

  const update = buildUpdatePayload(parsed);
  const url = resolveApiUrl(
    `/quotes/${encodeURIComponent(context.params.id)}/parts/${encodeURIComponent(context.params.line_id)}/config`,
  );

  const upstream = await proxyFetch(request, url, {
    method: 'PATCH',
    body: JSON.stringify(update),
    headers: { 'content-type': 'application/json' },
  });

  return buildProxyResponse(upstream);
}
