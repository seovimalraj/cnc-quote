'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ContractsVNext, CATALOG_SNAPSHOT } from '@cnc-quote/shared';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeftIcon,
  CubeIcon,
  DocumentIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface QuoteLine {
  id: string;
  fileId: string;
  fileName: string;
  process: 'CNC' | 'SheetMetal' | 'InjectionMolding';
  material: string;
  finish?: string;
  qty: number;
  status: 'Analyzing' | 'Priced' | 'Needs_Review' | 'Error';
  pricingBreakdown?: PricingBreakdown;
  leadTimeOptions?: LeadOption[];
  thumbnail?: string;
  currency?: string;
}

interface PricingBreakdown {
  setup_time_min: number;
  cycle_time_min: number;
  machine_rate_per_hr: number;
  material_buy_cost: number;
  material_waste_factor: number;
  tooling_wear_cost: number;
  finish_cost: number;
  inspection_cost: number;
  risk_adder: number;
  overhead: number;
  margin: number;
  unit_price: number;
}

interface LeadOption {
  id: string;
  region: 'USA' | 'International';
  speed: 'Economy' | 'Standard' | 'Expedite';
  business_days: number;
  unit_price: number;
  msrp: number;
  savings_text: string;
}

interface PriceBreakDisplay {
  quantity: number;
  unitPrice: number | null;
}

interface PartSpecs {
  quantity: number;
  process: 'CNC' | 'SheetMetal' | 'InjectionMolding';
  material: string;
  finish: string;
  threadsInserts: string;
  tolerancePack: 'Std' | 'Tight' | 'Critical';
  surfaceRoughness: string;
  partMarking: string;
  inspection: 'Std' | 'Formal' | 'CMM' | 'FAIR' | 'Source' | 'Custom';
  certificates: string[];
  notes: string;
}

const createDefaultSpecs = (): PartSpecs => ({
  quantity: 1,
  process: 'CNC',
  material: '',
  finish: 'None',
  threadsInserts: '',
  tolerancePack: 'Std',
  surfaceRoughness: '125',
  partMarking: '',
  inspection: 'Std',
  certificates: [],
  notes: '',
});

const materials = [
  'Aluminum 6061',
  'Aluminum 7075',
  'Steel 1018',
  'Steel 4140',
  'Stainless Steel 304',
  'Stainless Steel 316',
  'Brass 360',
  'Copper 110',
  'Plastic ABS',
  'Plastic Nylon',
  'Plastic Polycarbonate'
];

const finishes = [
  'None',
  'Anodized Clear',
  'Anodized Black',
  'Anodized Blue',
  'Powder Coat Black',
  'Powder Coat White',
  'Nickel Plating',
  'Chrome Plating',
  'Bead Blast',
  'Polished'
];

const certificates = [
  'Material Test Report',
  'Certificate of Conformance',
  'First Article Inspection',
  'PPAP Level 1',
  'PPAP Level 2',
  'PPAP Level 3',
  'ISO 9001',
  'AS9100'
];

type QuoteSummaryVNext = ContractsVNext.QuoteSummaryVNext;
type QuoteLineVNext = ContractsVNext.QuoteLineVNext;

const catalogMaterialById = new Map<string, string>(
  CATALOG_SNAPSHOT.materials.map((material) => [material.id, material.name]),
);

const catalogFinishById = new Map<string, string>(
  (CATALOG_SNAPSHOT.finishes ?? []).map((finish) => [finish.id, finish.name ?? finish.code ?? finish.id]),
);

const catalogMaterialNameToId = new Map<string, string>();
CATALOG_SNAPSHOT.materials.forEach((material) => {
  const candidates = [material.name, material.code];
  candidates
    .filter((value): value is string => Boolean(value))
    .forEach((value) => {
      catalogMaterialNameToId.set(value.trim().toLowerCase(), material.id);
    });
});

const catalogFinishNameToId = new Map<string, string>();
(CATALOG_SNAPSHOT.finishes ?? []).forEach((finish) => {
  const candidates = [finish.name, finish.code];
  candidates
    .filter((value): value is string => Boolean(value))
    .forEach((value) => {
      catalogFinishNameToId.set(value.trim().toLowerCase(), finish.id);
    });
});

const processDisplayToCode: Record<PartSpecs['process'], string> = {
  CNC: 'cnc_milling',
  SheetMetal: 'sheet_metal',
  InjectionMolding: 'cnc_milling',
};

const toleranceDisplayToCode: Record<PartSpecs['tolerancePack'], string> = {
  Std: 'standard',
  Tight: 'precision',
  Critical: 'high',
};

const inspectionDisplayToCode: Record<PartSpecs['inspection'], string> = {
  Std: 'basic',
  Formal: 'enhanced',
  CMM: 'full',
  FAIR: 'full',
  Source: 'full',
  Custom: 'full',
};

const surfaceDisplayToCode: Record<string, string> = {
  '125': 'standard',
  '63': 'improved',
  '32': 'fine',
  '16': 'polished',
};

const processCodeToDisplay: Record<string, QuoteLine['process']> = {
  cnc_milling: 'CNC',
  cnc_turning: 'CNC',
  cnc: 'CNC',
  sheet_metal: 'SheetMetal',
  sheetmetal: 'SheetMetal',
  injection_molding: 'InjectionMolding',
};

const toleranceMap: Record<string, PartSpecs['tolerancePack']> = {
  standard: 'Std',
  precision: 'Tight',
  high: 'Critical',
};

const inspectionMap: Record<string, PartSpecs['inspection']> = {
  basic: 'Std',
  enhanced: 'Formal',
  full: 'CMM',
};

const surfaceMap: Record<string, string> = {
  standard: '125',
  improved: '63',
  fine: '32',
};

const certificateLookup: Record<string, string> = {
  material_test_report: 'Material Test Report',
  certificate_of_conformance: 'Certificate of Conformance',
  first_article_inspection: 'First Article Inspection',
  ppap_level_1: 'PPAP Level 1',
  ppap_level_2: 'PPAP Level 2',
  ppap_level_3: 'PPAP Level 3',
  iso_9001: 'ISO 9001',
  as9100: 'AS9100',
};

const certificateReverseLookup: Record<string, string> = Object.fromEntries(
  Object.entries(certificateLookup).map(([operation, label]) => [label.toLowerCase(), operation]),
);

const getSelectedQuantity = (line: QuoteLineVNext): number => {
  const { selectedQuantity, quantities } = line.selection;
  if (typeof selectedQuantity === 'number' && selectedQuantity > 0) {
    return selectedQuantity;
  }
  if (Array.isArray(quantities) && quantities.length > 0) {
    return quantities[0] ?? 1;
  }
  return 1;
};

const deriveLineStatus = (line: QuoteLineVNext): QuoteLine['status'] => {
  const status = line.pricing.status ?? 'pending';
  switch (status) {
    case 'ready':
      return 'Priced';
    case 'review_required':
      return 'Needs_Review';
    case 'failed':
      return 'Error';
    default: {
      if (line.dfm?.status === 'failed') {
        return 'Needs_Review';
      }
      return 'Analyzing';
    }
  }
};

const resolveProcess = (value?: string | null): QuoteLine['process'] => {
  if (!value) return 'CNC';
  const normalized = value.toLowerCase();
  return processCodeToDisplay[normalized] ?? 'CNC';
};

const resolveMaterial = (line: QuoteLineVNext): string => {
  const { materialId, materialSpec } = line.selection;
  if (materialId) {
    const found = catalogMaterialById.get(materialId);
    if (found) return found;
  }
  if (materialSpec && materialSpec.trim().length > 0) {
    return materialSpec;
  }
  return 'Material TBD';
};

const resolveFinish = (line: QuoteLineVNext): string => {
  const finishIds = line.selection.finishIds ?? [];
  if (finishIds.length === 0) {
    return 'None';
  }
  const names = finishIds
    .map((id) => catalogFinishById.get(id) ?? id)
    .filter((name): name is string => Boolean(name));
  if (names.length === 0) {
    return 'None';
  }
  return names[0];
};

const resolveTolerance = (line: QuoteLineVNext): PartSpecs['tolerancePack'] => {
  const tolerance = line.selection.toleranceClass;
  if (!tolerance) {
    return 'Std';
  }
  return toleranceMap[tolerance.toLowerCase()] ?? 'Std';
};

const resolveInspection = (line: QuoteLineVNext): PartSpecs['inspection'] => {
  const inspection = line.selection.inspectionLevel;
  if (!inspection) {
    return 'Std';
  }
  return inspectionMap[inspection.toLowerCase()] ?? 'Std';
};

const resolveSurface = (line: QuoteLineVNext): string => {
  const surface = line.selection.surfaceFinish;
  if (!surface) {
    return '125';
  }
  return surfaceMap[surface.toLowerCase()] ?? '125';
};

const resolveThreads = (line: QuoteLineVNext): string => {
  const operations = line.selection.secondaryOperations ?? [];
  if (operations.some((operation) => operation.toLowerCase() === 'threading')) {
    return 'Threading required';
  }
  return '';
};

const resolveCertificates = (line: QuoteLineVNext): string[] => {
  const operations = line.selection.secondaryOperations ?? [];
  return operations
    .map((operation) => operation.toLowerCase())
    .filter((operation) => operation.startsWith('cert_'))
    .map((operation) => certificateLookup[operation.slice(5)] ?? null)
    .filter((value): value is string => Boolean(value));
};

const coerceNumeric = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const normalizeKey = (value?: string | null): string => (value ?? '').trim().toLowerCase();

const mapMaterialIdForApi = (value?: string): string | undefined => {
  const key = normalizeKey(value);
  if (!key) {
    return undefined;
  }
  return catalogMaterialNameToId.get(key);
};

const mapFinishIdsForApi = (value?: string): string[] | undefined => {
  const key = normalizeKey(value);
  if (!key) {
    return undefined;
  }
  const id = catalogFinishNameToId.get(key);
  return id ? [id] : undefined;
};

const mapToleranceForApi = (value: PartSpecs['tolerancePack']): string | undefined =>
  toleranceDisplayToCode[value] ?? undefined;

const mapInspectionForApi = (value: PartSpecs['inspection']): string | undefined =>
  inspectionDisplayToCode[value] ?? undefined;

const mapSurfaceForApi = (value: string): string | undefined => surfaceDisplayToCode[value] ?? undefined;

const collectSecondaryOperationsFromSpecs = (specs: PartSpecs): string[] => {
  const operations = new Set<string>();
  if (specs.threadsInserts.trim().length > 0) {
    operations.add('threading');
  }
  specs.certificates.forEach((label) => {
    const key = certificateReverseLookup[label.toLowerCase()];
    if (key) {
      operations.add(`cert_${key}`);
    }
  });
  return Array.from(operations);
};

const buildPricingPartConfig = (specs: PartSpecs): Record<string, unknown> => {
  const payload: Record<string, unknown> = {
    ui_specs_snapshot: specs,
  };

  const processCode = processDisplayToCode[specs.process];
  if (processCode) {
    payload.process_type = processCode;
  }

  const materialId = mapMaterialIdForApi(specs.material);
  if (materialId) {
    payload.material_id = materialId;
  } else if (specs.material.trim()) {
    payload.material_spec = specs.material.trim();
  }

  const finishIds = mapFinishIdsForApi(specs.finish);
  if (finishIds && finishIds.length > 0) {
    payload.finish_ids = finishIds;
  }

  const tolerance = mapToleranceForApi(specs.tolerancePack);
  if (tolerance) {
    payload.tolerance_class = tolerance;
  }

  const inspection = mapInspectionForApi(specs.inspection);
  if (inspection) {
    payload.inspection_level = inspection;
  }

  const surface = mapSurfaceForApi(specs.surfaceRoughness);
  if (surface) {
    payload.surface_finish = surface;
  }

  if (specs.partMarking.trim()) {
    payload.part_marking = specs.partMarking.trim();
  }

  const secondaryOperations = collectSecondaryOperationsFromSpecs(specs);
  if (secondaryOperations.length > 0) {
    payload.secondary_operations = secondaryOperations;
  }

  if (specs.notes.trim()) {
    payload.special_instructions = specs.notes.trim();
  }

  return payload;
};

const buildPricingRequest = (
  quoteId: string,
  lineId: string,
  specs: PartSpecs,
  currency: string,
): ContractsVNext.PricingInputLight => ({
  quoteId,
  currency,
  lines: [
    {
      id: lineId,
      quantity: specs.quantity,
      quantities: [specs.quantity],
      partConfig: buildPricingPartConfig(specs),
    },
  ],
});

const resolveUnitPrice = (
  entry: { unitPrice?: number | null; totalPrice?: number | null },
  quantity: number,
): number => {
  if (typeof entry.unitPrice === 'number' && Number.isFinite(entry.unitPrice)) {
    return entry.unitPrice;
  }
  if (typeof entry.totalPrice === 'number' && Number.isFinite(entry.totalPrice) && quantity > 0) {
    return entry.totalPrice / quantity;
  }
  return 0;
};

const mapEntryToBreakdown = (
  entry: { breakdown?: Record<string, unknown>; unitPrice?: number | null; totalPrice?: number | null },
  quantity: number,
): PricingBreakdown => {
  const breakdown = entry.breakdown ?? {};
  const unitPrice = resolveUnitPrice(entry, quantity);

  return {
    setup_time_min: coerceNumeric(breakdown.setup_minutes),
    cycle_time_min: coerceNumeric(breakdown.cycle_minutes),
    machine_rate_per_hr: coerceNumeric(breakdown.machine_rate_per_hour),
    material_buy_cost: coerceNumeric(breakdown.material_cost),
    material_waste_factor: coerceNumeric(breakdown.material_waste_factor, 1),
    tooling_wear_cost: coerceNumeric(breakdown.tooling_cost),
    finish_cost: coerceNumeric(breakdown.finish_cost),
    inspection_cost: coerceNumeric(breakdown.inspection_cost),
    risk_adder: coerceNumeric(breakdown.risk_adder),
    overhead: coerceNumeric(breakdown.overhead),
    margin: coerceNumeric(breakdown.margin),
    unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
  };
};

const mapMatrixToPriceBreaks = (
  matrix: Array<{ quantity: number; unitPrice?: number | null; totalPrice?: number | null }>,
): PriceBreakDisplay[] => {
  if (!Array.isArray(matrix) || matrix.length === 0) {
    return [];
  }

  return matrix
    .slice()
    .filter((entry) => typeof entry.quantity === 'number' && Number.isFinite(entry.quantity) && entry.quantity > 0)
    .sort((a, b) => (a.quantity ?? 0) - (b.quantity ?? 0))
    .map((entry) => {
      const unitPrice = (() => {
        if (typeof entry.unitPrice === 'number' && Number.isFinite(entry.unitPrice)) {
          return entry.unitPrice;
        }
        if (typeof entry.totalPrice === 'number' && Number.isFinite(entry.totalPrice) && entry.quantity > 0) {
          return entry.totalPrice / entry.quantity;
        }
        return null;
      })();

      return {
        quantity: entry.quantity,
        unitPrice,
      };
    });
};

const buildPricingBreakdown = (line: QuoteLineVNext): PricingBreakdown | null => {
  const quantity = getSelectedQuantity(line);
  const matrix = Array.isArray(line.pricing.matrix) ? line.pricing.matrix : [];
  if (matrix.length === 0) {
    return null;
  }

  const targetEntry = matrix.find((entry) => entry.quantity === quantity) ?? matrix[0];
  return mapEntryToBreakdown(targetEntry, quantity);
};

const buildPriceBreaks = (line: QuoteLineVNext): PriceBreakDisplay[] => {
  const matrix = Array.isArray(line.pricing.matrix) ? line.pricing.matrix : [];
  return mapMatrixToPriceBreaks(matrix);
};

const formatCurrency = (value: number | null | undefined, fallback = '—'): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (error) {
    console.warn('Failed to format currency', error);
    return `$${value.toFixed(2)}`;
  }
};

const mapQuoteLine = (line: QuoteLineVNext): QuoteLine => {
  const qty = getSelectedQuantity(line);
  const pricingBreakdown = buildPricingBreakdown(line) ?? undefined;
  return {
    id: line.id,
    fileId: line.fileId ?? line.id,
    fileName: line.fileId ?? `Part ${line.id}`,
    process: resolveProcess(line.selection.processType),
    material: resolveMaterial(line),
    finish: resolveFinish(line),
    qty,
    status: deriveLineStatus(line),
    pricingBreakdown,
    currency: line.pricing.currency ?? 'USD',
  };
};

const deriveSpecsFromLine = (line: QuoteLineVNext): PartSpecs => ({
  quantity: getSelectedQuantity(line),
  process: resolveProcess(line.selection.processType),
  material: resolveMaterial(line),
  finish: resolveFinish(line),
  threadsInserts: resolveThreads(line),
  tolerancePack: resolveTolerance(line),
  surfaceRoughness: resolveSurface(line),
  partMarking: '',
  inspection: resolveInspection(line),
  certificates: resolveCertificates(line),
  notes: '',
});

export default function ConfigurePartPage() {
  const params = useParams<{ id?: string | string[]; line_id?: string | string[] }>();
  const router = useRouter();
  const rawQuoteId = params?.id;
  const rawLineId = params?.line_id;
  const quoteId = Array.isArray(rawQuoteId) ? rawQuoteId[0] ?? '' : rawQuoteId ?? '';
  const lineId = Array.isArray(rawLineId) ? rawLineId[0] ?? '' : rawLineId ?? '';

  const [line, setLine] = useState<QuoteLine | null>(null);
  const [specs, setSpecs] = useState<PartSpecs>(() => createDefaultSpecs());
  const [materialOptions, setMaterialOptions] = useState<string[]>(materials);
  const [finishOptions, setFinishOptions] = useState<string[]>(finishes);
  const [priceBreaks, setPriceBreaks] = useState<PriceBreakDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pricePreview, setPricePreview] = useState<PricingBreakdown | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    loadLineData();
  }, [quoteId, lineId]);

  useEffect(() => {
    // Autosave when specs change
    const timeoutId = setTimeout(() => {
      if (line && !isLoading) {
        handleAutosave();
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [specs]);

  const loadLineData = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      if (!quoteId || !lineId) {
        setLoadError('Missing quote or part identifier.');
        setLine(null);
        setSpecs(createDefaultSpecs());
        setPricePreview(null);
        setPriceBreaks([]);
        return;
      }

      const response = await fetch(`/api/quotes/${encodeURIComponent(quoteId)}?view=vnext`);

      if (!response.ok) {
        if (response.status === 404) {
          setLoadError('Quote not found.');
        } else if (response.status === 403) {
          setLoadError('Access denied for this quote.');
        } else {
          setLoadError('Failed to load quote details.');
        }
        setLine(null);
        setSpecs(createDefaultSpecs());
        setPricePreview(null);
        setPriceBreaks([]);
        return;
      }

      const payload = await response.json();

      let parsed: QuoteSummaryVNext;
      try {
        parsed = ContractsVNext.QuoteSummarySchema.parse(payload);
      } catch (parseError) {
        console.error('Failed to parse quote payload:', parseError);
        setLoadError('Received malformed quote data.');
        setLine(null);
        setSpecs(createDefaultSpecs());
        setPricePreview(null);
        setPriceBreaks([]);
        return;
      }

      const targetLine = parsed.lines.find((candidate) => candidate.id === lineId);
      if (!targetLine) {
        setLoadError('Part not found on this quote.');
        setLine(null);
        setSpecs(createDefaultSpecs());
        setPricePreview(null);
        setPriceBreaks([]);
        return;
      }

    const mappedLine = mapQuoteLine(targetLine);
    const initialSpecs = deriveSpecsFromLine(targetLine);
    const priceBreakDisplay = buildPriceBreaks(targetLine);

    setLine(mappedLine);
    setSpecs(initialSpecs);
    setPricePreview(mappedLine.pricingBreakdown ?? null);
    setPriceBreaks(priceBreakDisplay);

      setMaterialOptions((previous) => {
        if (!initialSpecs.material || previous.includes(initialSpecs.material)) {
          return previous;
        }
        return [...previous, initialSpecs.material];
      });

      setFinishOptions((previous) => {
        if (!initialSpecs.finish || previous.includes(initialSpecs.finish)) {
          return previous;
        }
        return [...previous, initialSpecs.finish];
      });
    } catch (error) {
      console.error('Failed to load line data:', error);
      setLoadError('Unexpected error loading part details.');
      setLine(null);
      setSpecs(createDefaultSpecs());
      setPricePreview(null);
      setPriceBreaks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutosave = async () => {
    if (!line || !quoteId || !lineId) return;

    try {
      setIsSaving(true);

      // Update line specs
      await fetch(`/api/quotes/${quoteId}/lines/${lineId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(specs)
      });

      // Trigger re-pricing
      const pricingRequest = buildPricingRequest(quoteId, lineId, specs, line.currency ?? 'USD');
      const priceResponse = await fetch('/api/pricing/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pricingRequest)
      });

      if (priceResponse.ok) {
        const rawPricing = await priceResponse.json();

        try {
          const computation = ContractsVNext.PricingComputationSchema.parse(rawPricing);
          const matrix = computation.matrix ?? [];

          setPriceBreaks(mapMatrixToPriceBreaks(matrix));

          const matchingRow = matrix.find((entry) => entry.quantity === specs.quantity) ?? matrix[0];
          if (matchingRow) {
            const targetQuantity =
              typeof matchingRow.quantity === 'number' && matchingRow.quantity > 0
                ? matchingRow.quantity
                : specs.quantity;
            setPricePreview(mapEntryToBreakdown(matchingRow, targetQuantity));
          }
        } catch (pricingError) {
          console.error('Failed to parse pricing response:', pricingError);
        }
      }

      setLastSaved(new Date());
    } catch (error) {
      console.error('Autosave failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSpecChange = (field: keyof PartSpecs, value: any) => {
    setSpecs(prev => ({ ...prev, [field]: value }));
  };

  const handleCertificateToggle = (certificate: string) => {
    setSpecs(prev => ({
      ...prev,
      certificates: prev.certificates.includes(certificate)
        ? prev.certificates.filter(c => c !== certificate)
        : [...prev.certificates, certificate]
    }));
  };

  const handleSave = async () => {
    await handleAutosave();
    router.push(`/quote/${quoteId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading part configuration...</p>
        </div>
      </div>
    );
  }

  if (!line) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle>Part unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              {loadError || 'We could not find this part on the quote. Please refresh or return to the quote overview.'}
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => loadLineData()}>
                Retry
              </Button>
              <Button onClick={() => router.push(`/quote/${quoteId}`)}>
                Back to Quote
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/quote/${quoteId}`)}
                className="mr-4"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Quote
              </Button>
              <CubeIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <h1 className="text-xl font-bold text-gray-900">Configure Part</h1>
                <p className="text-sm text-gray-600">{line.fileName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {lastSaved && (
                <span className="text-sm text-gray-500">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
              )}
              {isSaving && (
                <div className="flex items-center text-sm text-blue-600">
                  <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" />
                  Saving...
                </div>
              )}
              <Button onClick={handleSave}>
                <CheckIcon className="w-4 h-4 mr-2" />
                Save & Return
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel */}
          <div className="space-y-6">
            {/* Files Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Files</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <DocumentIcon className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-medium">{line.fileName}</p>
                      <p className="text-sm text-gray-600">Primary CAD file</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full">
                    <DocumentIcon className="w-4 h-4 mr-2" />
                    Add Attachments (Drawings, Specs)
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mini Viewer */}
            <Card>
              <CardHeader>
                <CardTitle>3D Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <CubeIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600">3D Model Preview</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Specification Form */}
            <Card>
              <CardHeader>
                <CardTitle>Part Specifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quantity */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="quantity">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={specs.quantity}
                      onChange={(e) => handleSpecChange('quantity', parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div>
                    <Label>Price Breaks</Label>
                    <div className="text-sm text-gray-600 mt-2 space-y-1">
                      {priceBreaks.length === 0 ? (
                        <p>Pricing in progress.</p>
                      ) : (
                        priceBreaks.map((priceBreak) => (
                          <p key={priceBreak.quantity}>
                            Qty {priceBreak.quantity}:{' '}
                            <span className="font-medium text-gray-900">
                              {formatCurrency(priceBreak.unitPrice, 'Pending')} each
                            </span>
                          </p>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Process */}
                <div>
                  <Label htmlFor="process">Process</Label>
                  <Select value={specs.process} onValueChange={(value) => handleSpecChange('process', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CNC">CNC Machining</SelectItem>
                      <SelectItem value="SheetMetal">Sheet Metal</SelectItem>
                      <SelectItem value="InjectionMolding">Injection Molding</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Material */}
                <div>
                  <Label htmlFor="material">Material</Label>
                  <Select value={specs.material} onValueChange={(value) => handleSpecChange('material', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {materialOptions
                        .filter((material) => material && material.trim().length > 0)
                        .map((material) => (
                          <SelectItem key={material} value={material}>
                            {material}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Finish */}
                <div>
                  <Label htmlFor="finish">Finish</Label>
                  <Select value={specs.finish} onValueChange={(value) => handleSpecChange('finish', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {finishOptions
                        .filter((finish) => finish && finish.trim().length > 0)
                        .map((finish) => (
                          <SelectItem key={finish} value={finish}>
                            {finish}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Threads & Inserts */}
                <div>
                  <Label htmlFor="threadsInserts">Threads & Inserts</Label>
                  <Textarea
                    id="threadsInserts"
                    placeholder="Specify any threads, inserts, or special features..."
                    value={specs.threadsInserts}
                    onChange={(e) => handleSpecChange('threadsInserts', e.target.value)}
                  />
                </div>

                {/* Tolerance Pack */}
                <div>
                  <Label htmlFor="tolerancePack">Tolerance Package</Label>
                  <Select value={specs.tolerancePack} onValueChange={(value) => handleSpecChange('tolerancePack', value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Std">Standard (±0.005")</SelectItem>
                      <SelectItem value="Tight">Tight (±0.002")</SelectItem>
                      <SelectItem value="Critical">Critical (±0.001")</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Surface Roughness */}
                <div>
                  <Label htmlFor="surfaceRoughness">Surface Roughness (µin)</Label>
                  <Select value={specs.surfaceRoughness} onValueChange={(value) => handleSpecChange('surfaceRoughness', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="125">125 µin (Standard)</SelectItem>
                      <SelectItem value="63">63 µin (Fine)</SelectItem>
                      <SelectItem value="32">32 µin (Very Fine)</SelectItem>
                      <SelectItem value="16">16 µin (Mirror)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Part Marking */}
                <div>
                  <Label htmlFor="partMarking">Part Marking</Label>
                  <Input
                    id="partMarking"
                    placeholder="Serial numbers, logos, etc."
                    value={specs.partMarking}
                    onChange={(e) => handleSpecChange('partMarking', e.target.value)}
                  />
                </div>

                {/* Inspection */}
                <div>
                  <Label htmlFor="inspection">Inspection Level</Label>
                  <Select value={specs.inspection} onValueChange={(value) => handleSpecChange('inspection', value as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Std">Standard</SelectItem>
                      <SelectItem value="Formal">Formal</SelectItem>
                      <SelectItem value="CMM">CMM Inspection</SelectItem>
                      <SelectItem value="FAIR">First Article Inspection Report</SelectItem>
                      <SelectItem value="Source">Source Inspection</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Certificates */}
                <div>
                  <Label>Certificates & Documentation</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {certificates.map((certificate) => (
                      <div key={certificate} className="flex items-center space-x-2">
                        <Checkbox
                          id={certificate}
                          checked={specs.certificates.includes(certificate)}
                          onCheckedChange={() => handleCertificateToggle(certificate)}
                        />
                        <Label htmlFor={certificate} className="text-sm">
                          {certificate}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any special instructions or requirements..."
                    value={specs.notes}
                    onChange={(e) => handleSpecChange('notes', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Price Preview */}
        {pricePreview && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Price Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Unit Price</h4>
                    <p className="text-2xl font-bold text-green-600">${(pricePreview?.unit_price || 0).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">per part</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Total Price</h4>
                    <p className="text-2xl font-bold">${((pricePreview?.unit_price || 0) * specs.quantity).toFixed(2)}</p>
                    <p className="text-sm text-gray-600">for {specs.quantity} parts</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Cycle Time</h4>
                    <p className="text-lg font-semibold">{pricePreview?.cycle_time_min || 0} min</p>
                    <p className="text-sm text-gray-600">per part</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
