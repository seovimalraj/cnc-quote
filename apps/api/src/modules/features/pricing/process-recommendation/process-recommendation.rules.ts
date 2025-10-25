import { ProcessRule } from './process-recommendation.types';

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const PROCESS_RECOMMENDATION_RULES: ProcessRule[] = [
  {
    id: 'baseline/configured-process',
    description: 'Boost the configured process type to honor operator intent.',
    evaluate: (ctx, adjust) => {
      const configured = ctx.partConfig.process_type;
      if (!configured) {
        return;
      }
      switch (configured) {
        case 'cnc_milling':
          adjust('cnc_milling_3axis', 0.4, 'Configured process is CNC milling');
          if ((ctx.metrics.features.total ?? 0) > 18 || ctx.geometryFlags.includes('complex_geometry')) {
            adjust('cnc_milling_5axis', 0.25, 'Complex geometry benefits from 5-axis milling');
          }
          break;
        case 'cnc_turning':
          adjust('cnc_turning', 0.5, 'Configured process is CNC turning');
          break;
        case 'sheet_metal':
        case 'sheet_metal_laser':
        case 'sheet_metal_brake':
          adjust('sheet_metal_laser', 0.45, 'Configured process is sheet metal');
          if ((ctx.metrics.sheet.bendCount ?? 0) >= 4) {
            adjust('sheet_metal_brake', 0.3, 'High bend count requires brake forming support');
          }
          break;
        default:
          adjust('cnc_milling_3axis', 0.2, `Fallback to CNC milling for process ${configured}`);
      }
    },
  },
  {
    id: 'geometry/aspect-ratio-turning',
    description: 'High aspect ratio parts with rotational symmetry favor turning.',
    evaluate: (ctx, adjust) => {
      const bbox = ctx.metrics.bbox;
      if (!isFiniteNumber(bbox.aspectRatio) || !isFiniteNumber(bbox.length) || !isFiniteNumber(bbox.width) || !isFiniteNumber(bbox.height)) {
        return;
      }
      const aspect = bbox.aspectRatio ?? 1;
      const crossSectionSimilarity = Math.abs((bbox.width ?? 1) - (bbox.height ?? 1)) / Math.max(bbox.width ?? 1, bbox.height ?? 1);
      if (aspect >= 3 && crossSectionSimilarity <= 0.25) {
        adjust('cnc_turning', 0.35, 'Tall cylindrical profile suits turning');
      }
      if (aspect < 1.5 && (ctx.metrics.features.holes ?? 0) > 6) {
        adjust('cnc_milling_3axis', 0.1, 'Balanced aspect ratio with many holes prefers milling');
      }
    },
  },
  {
    id: 'geometry/thin-sheet',
    description: 'Thin sheet stock with moderate area prefers laser cutting.',
    evaluate: (ctx, adjust) => {
      const thickness = ctx.metrics.sheet.thicknessMm ?? null;
      const area = ctx.metrics.sheet.flatAreaCm2 ?? null;
      if (isFiniteNumber(thickness) && thickness <= 4) {
        adjust('sheet_metal_laser', clamp(0.2 + (area && area > 400 ? 0.1 : 0), 0.2, 0.35), 'Thin sheet stock is efficient for laser cutting');
        if ((ctx.metrics.sheet.bendCount ?? 0) >= 2) {
          adjust('sheet_metal_brake', 0.2, 'Multiple bends suggest brake forming');
        }
      }
      if (isFiniteNumber(thickness) && thickness >= 8) {
        adjust('sheet_metal_laser', -0.25, 'Thick plate reduces laser efficiency', { caution: true });
      }
    },
  },
  {
    id: 'geometry/feature-complexity',
    description: 'Dense features and undercuts drive toward 5-axis CNC milling.',
    evaluate: (ctx, adjust) => {
      const totalFeatures = ctx.metrics.features.total ?? 0;
      if (totalFeatures >= 20 || ctx.geometryFlags.includes('complex_geometry')) {
        adjust('cnc_milling_5axis', 0.3, 'High feature density benefits from 5-axis access');
      }
      if (ctx.metrics.features.undercuts > 0 || ctx.geometryFlags.includes('undercut_detected')) {
        adjust('cnc_milling_5axis', 0.25, 'Undercuts require multi-axis strategies');
      }
      if ((ctx.metrics.features.bends ?? 0) > 6) {
        adjust('sheet_metal_brake', 0.25, 'Numerous bends favor dedicated forming');
      }
    },
  },
  {
    id: 'requirements/tolerance',
    description: 'Tight tolerances and high machining complexity prefer 5-axis milling.',
    evaluate: (ctx, adjust) => {
      const tolerance = ctx.toleranceClass?.toLowerCase() ?? 'standard';
      const highPrecision = tolerance === 'high' || tolerance === 'precision';
      const complexMachining = (ctx.partConfig.machining_complexity ?? 'medium') === 'high';
      if (highPrecision || complexMachining) {
        adjust('cnc_milling_5axis', 0.2, 'Precision requirements favor advanced milling setups');
      }
      if (highPrecision && ctx.partConfig.process_type === 'sheet_metal') {
        adjust('sheet_metal_laser', -0.2, 'Tight tolerances are challenging on sheet processes', { caution: true });
      }
    },
  },
  {
    id: 'quantity/high-volume',
    description: 'High production quantities incentivize sheet processes or turning.',
    evaluate: (ctx, adjust) => {
      if (ctx.quantity >= 250) {
        adjust('sheet_metal_laser', 0.2, 'High volume enables efficient sheet metal nesting');
        adjust('cnc_turning', 0.15, 'Turned parts amortize setup over large volumes');
      }
      if (ctx.quantity <= 5) {
        adjust('sheet_metal_laser', -0.15, 'Low volume reduces sheet metal efficiency', { caution: true });
      }
    },
  },
  {
    id: 'material/category',
    description: 'Material category influences viable processes.',
    evaluate: (ctx, adjust) => {
      const material = (ctx.materialCode ?? '').toLowerCase();
      if (!material) {
        return;
      }
      const isPlastic = material.includes('abs') || material.includes('asa') || material.includes('delrin') || material.includes('acetal') || material.includes('pla') || material.includes('petg');
      if (isPlastic) {
        adjust('additive_sls', 0.25, 'Plastic materials are additive-friendly');
        adjust('sheet_metal_laser', -0.25, 'Sheet metal processes expect metal stock', { caution: true });
      }
      const isStainless = material.includes('17-4') || material.includes('stainless');
      if (isStainless) {
        adjust('cnc_milling_5axis', 0.1, 'Hard materials with tight tolerances benefit from rigid 5-axis setups');
      }
    },
  },
  {
    id: 'dfm/issues',
    description: 'DFM findings adjust candidate confidence.',
    evaluate: (ctx, adjust) => {
      const cautionIssues = ctx.dfmIssues.filter(issue => issue.severity === 'critical' || issue.severity === 'warn');
      for (const issue of cautionIssues) {
        switch (issue.category) {
          case 'thin_wall':
            adjust('sheet_metal_laser', -0.2, 'Thin wall DFM flag reduces sheet metal confidence', { caution: true });
            adjust('cnc_milling_5axis', 0.15, 'Thin walls benefit from precise CNC control');
            break;
          case 'undercut':
            adjust('cnc_milling_5axis', 0.2, 'Undercuts are better handled on multi-axis CNC');
            break;
          case 'feature_density':
            adjust('cnc_milling_5axis', 0.15, 'Dense features require flexible tooling paths');
            break;
          case 'surface_finish_risk':
            adjust('cnc_milling_3axis', 0.05, 'Machining can improve finish control');
            break;
          default:
            break;
        }
      }
    },
  },
];
