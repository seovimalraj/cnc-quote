/**
 * Process Recommendation Rules (Step 10)
 * Rule catalog from specification
 */

import { ProcessRule, RecommendCtx } from '../types';

const safe = (value: any, fallback: number = 0): number => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

export const RULES: ProcessRule[] = [
  {
    id: 'TURNING_GEOM_AXIS',
    if: (ctx: RecommendCtx) => {
      const axis = ctx.features.rotational_symmetry_axis;
      if (!axis) return false;
      const dims = [ctx.features.bbox.x, ctx.features.bbox.y, ctx.features.bbox.z];
      const longest = Math.max(...dims);
      const shortest = Math.min(...dims.filter(d => d > 0));
      return longest / shortest >= 2.0;
    },
    then: {
      process: 'turning',
      geometry_fit: 0.6,
      reasons: ['Rotational symmetry and high L/D ratio'],
    },
  },
  {
    id: 'TURNING_CYL_HINT',
    if: (ctx: RecommendCtx) => ctx.features.cylindricity_hint === true,
    then: {
      process: 'turning',
      feature_match: 0.3,
      reasons: ['Cylindrical primitives detected'],
    },
  },
  {
    id: 'MILLING_PLANAR',
    if: (ctx: RecommendCtx) => {
      return (
        ctx.features.sheet_like_hint.is_sheet_like === false &&
        ctx.features.sheet_like_hint.planar_faces_pct >= 0.4
      );
    },
    then: {
      process: 'cnc_milling',
      geometry_fit: 0.4,
      reasons: ['Large planar face area suitable for milling'],
    },
  },
  {
    id: 'MILLING_POCKETS',
    if: (ctx: RecommendCtx) => {
      if (!Array.isArray(ctx.features.pockets) || ctx.features.pockets.length === 0) return false;
      const maxAspect = Math.max(...ctx.features.pockets.map(p => safe(p.aspect, 0)));
      const maxDepth = Math.max(...ctx.features.pockets.map(p => safe(p.depth_mm, 0)));
      return maxAspect <= 6 && maxDepth <= 60;
    },
    then: {
      process: 'cnc_milling',
      feature_match: 0.35,
      reasons: ['Pocket geometry within typical milling envelopes'],
    },
  },
  {
    id: 'SHEET_LIKE',
    if: (ctx: RecommendCtx) => {
      const hint = ctx.features.sheet_like_hint;
      return hint.is_sheet_like === true && hint.thickness_mm <= 6 && hint.planar_faces_pct >= 0.7;
    },
    then: {
      process: 'sheet_metal',
      geometry_fit: 0.7,
      reasons: ['Thin, planar geometry suggests sheet fabrication'],
    },
  },
  {
    id: 'SHEET_BEND_PENALTY',
    if: (ctx: RecommendCtx) => {
      const hint = ctx.features.sheet_like_hint;
      const minWall = ctx.features.min_wall_thickness_mm;
      return hint.is_sheet_like === true && minWall !== null && minWall < 0.8;
    },
    then: {
      process: 'sheet_metal',
      constraint_penalty: 0.2,
      reasons: ['Very thin sections may exceed bend limits'],
    },
  },
  {
    id: 'IM_INTENT',
    if: (ctx: RecommendCtx) => {
      return ctx.config.requested_process === 'injection_molding' || ctx.config.quantity >= 1000;
    },
    then: {
      process: 'injection_molding',
      user_intent_bonus: 0.3,
      reasons: ['High quantity or explicit IM request'],
    },
  },
  {
    id: 'IM_THICKNESS_CONSTRAINT',
    if: (ctx: RecommendCtx) => {
      const minWall = ctx.features.min_wall_thickness_mm;
      return ctx.config.requested_process === 'injection_molding' && minWall !== null && minWall < 1.0;
    },
    then: {
      process: 'injection_molding',
      constraint_penalty: 0.25,
      blocking_constraints: ['Walls under 1.0 mm problematic for IM'],
    },
  },
  {
    id: 'ADD_SIMPLE',
    if: (ctx: RecommendCtx) => {
      if (ctx.features.undercuts_present === true) return true;
      if (!Array.isArray(ctx.features.pockets) || ctx.features.pockets.length === 0) return false;
      const maxAspect = Math.max(...ctx.features.pockets.map(p => safe(p.aspect, 0)));
      return maxAspect > 8;
    },
    then: {
      process: 'additive',
      geometry_fit: 0.35,
      reasons: ['Undercuts/high aspect pockets hint additive suitability'],
    },
  },
  {
    id: 'TURNING_HOLE_ALIGNMENT_PENALTY',
    if: (ctx: RecommendCtx) => {
      const axis = ctx.features.rotational_symmetry_axis;
      if (!axis || !Array.isArray(ctx.features.holes)) return false;
      // Simple heuristic: if holes exist and we have rotational symmetry, assume some may be non-axial
      return ctx.features.holes.length > 0;
    },
    then: {
      process: 'turning',
      constraint_penalty: 0.25,
      reasons: ['Non-axial holes complicate turning-only approach'],
    },
  },
];
