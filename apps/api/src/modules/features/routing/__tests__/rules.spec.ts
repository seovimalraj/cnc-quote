/**
 * Process Recommendation Rules Tests (Step 10)
 */

import { RULES } from "../rules/rules";
import { RecommendCtx } from "../types";

describe('Process Recommendation Rules', () => {
  describe('TURNING_GEOM_AXIS', () => {
    it('should fire when rotational symmetry axis present and L/D >= 2', () => {
      const ctx: RecommendCtx = {
        features: {
          bbox: { x: 100, y: 50, z: 50 },
          rotational_symmetry_axis: 'X',
          volume_mm3: 250000,
          surface_area_mm2: 25000,
          min_wall_thickness_mm: null,
          cylindricity_hint: false,
          sheet_like_hint: { is_sheet_like: false, thickness_mm: 0, planar_faces_pct: 0 },
          holes: [],
          pockets: [],
          threads_hint: false,
        },
        config: {
          requested_process: null,
          material_code: 'AL-6061',
          quantity: 10,
        },
      };

      const rule = RULES.find((r) => r.id === 'TURNING_GEOM_AXIS');
      expect(rule).toBeDefined();
      expect(rule!.if(ctx)).toBe(true);
      expect(rule!.then.process).toBe('turning');
      expect(rule!.then.geometry_fit).toBe(0.6);
    });

    it('should not fire when no rotational symmetry', () => {
      const ctx: RecommendCtx = {
        features: {
          bbox: { x: 100, y: 50, z: 50 },
          rotational_symmetry_axis: null,
          volume_mm3: 250000,
          surface_area_mm2: 25000,
          min_wall_thickness_mm: null,
          cylindricity_hint: false,
          sheet_like_hint: { is_sheet_like: false, thickness_mm: 0, planar_faces_pct: 0 },
          holes: [],
          pockets: [],
          threads_hint: false,
        },
        config: {
          requested_process: null,
          material_code: 'AL-6061',
          quantity: 10,
        },
      };

      const rule = RULES.find((r) => r.id === 'TURNING_GEOM_AXIS');
      expect(rule!.if(ctx)).toBe(false);
    });
  });

  describe('SHEET_LIKE', () => {
    it('should select sheet_metal with thickness <= 6 and planar_faces_pct >= 0.7', () => {
      const ctx: RecommendCtx = {
        features: {
          bbox: { x: 200, y: 150, z: 3 },
          rotational_symmetry_axis: null,
          volume_mm3: 90000,
          surface_area_mm2: 60000,
          min_wall_thickness_mm: 3,
          cylindricity_hint: false,
          sheet_like_hint: { is_sheet_like: true, thickness_mm: 3, planar_faces_pct: 0.85 },
          holes: [],
          pockets: [],
          threads_hint: false,
        },
        config: {
          requested_process: null,
          material_code: 'STEEL-304',
          quantity: 50,
        },
      };

      const rule = RULES.find((r) => r.id === 'SHEET_LIKE');
      expect(rule).toBeDefined();
      expect(rule!.if(ctx)).toBe(true);
      expect(rule!.then.process).toBe('sheet_metal');
      expect(rule!.then.geometry_fit).toBe(0.7);
    });
  });

  describe('IM_INTENT', () => {
    it('should boost IM when quantity >= 1000', () => {
      const ctx: RecommendCtx = {
        features: {
          bbox: { x: 50, y: 50, z: 20 },
          rotational_symmetry_axis: null,
          volume_mm3: 50000,
          surface_area_mm2: 15000,
          min_wall_thickness_mm: 2,
          cylindricity_hint: false,
          sheet_like_hint: { is_sheet_like: false, thickness_mm: 0, planar_faces_pct: 0 },
          holes: [],
          pockets: [],
          threads_hint: false,
        },
        config: {
          requested_process: null,
          material_code: 'ABS',
          quantity: 1500,
        },
      };

      const rule = RULES.find((r) => r.id === 'IM_INTENT');
      expect(rule).toBeDefined();
      expect(rule!.if(ctx)).toBe(true);
      expect(rule!.then.process).toBe('injection_molding');
      expect(rule!.then.user_intent_bonus).toBe(0.3);
    });
  });

  describe('MILLING_POCKETS', () => {
    it('should fire for pockets within milling envelopes', () => {
      const ctx: RecommendCtx = {
        features: {
          bbox: { x: 100, y: 100, z: 50 },
          rotational_symmetry_axis: null,
          volume_mm3: 500000,
          surface_area_mm2: 40000,
          min_wall_thickness_mm: null,
          cylindricity_hint: false,
          sheet_like_hint: { is_sheet_like: false, thickness_mm: 0, planar_faces_pct: 0.3 },
          holes: [],
          pockets: [
            { depth_mm: 30, aspect: 4, count: 2 },
            { depth_mm: 25, aspect: 5, count: 1 },
          ],
          threads_hint: false,
        },
        config: {
          requested_process: null,
          material_code: 'AL-6061',
          quantity: 10,
        },
      };

      const rule = RULES.find((r) => r.id === 'MILLING_POCKETS');
      expect(rule).toBeDefined();
      expect(rule!.if(ctx)).toBe(true);
      expect(rule!.then.process).toBe('cnc_milling');
      expect(rule!.then.feature_match).toBe(0.35);
    });
  });
});
