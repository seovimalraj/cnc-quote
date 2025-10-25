import { performance } from 'perf_hooks';
import {
  FeatureType,
  FeatureProperties,
  FeatureExtractionResult,
  FeatureExtractionConfig,
  DFM_RULES,
  FeatureLocation,
  FeatureDimensions
} from './features';

export class FeatureExtractionService {
  private config: FeatureExtractionConfig;

  constructor(config?: Partial<FeatureExtractionConfig>) {
    this.config = {
      min_hole_diameter: 1.0,
      min_feature_size: 0.5,
      tolerance_sensitivity: 0.5,
      surface_finish_detection: true,
      thread_detection: true,
      undercut_detection: true,
      ...config
    };
  }

  async extractFeatures(
    geometry: {
      volume_mm3: number;
      area_mm2: number;
      bbox_mm: number[];
      features?: Record<string, unknown>;
    },
    materialCode: string,
    processCode: string
  ): Promise<FeatureExtractionResult> {
    const startTime = performance.now();

    // Extract features based on geometry and process
    const features = await this.analyzeGeometry(geometry, materialCode, processCode);

    // Apply DFM analysis
    const dffViolations = this.analyzeDFM(features);

    // Calculate summary statistics
    const featureCounts = features.reduce((acc, feature) => {
      acc[feature.type] = (acc[feature.type] || 0) + 1;
      return acc;
    }, {} as Record<FeatureType, number>);

    const totalMaterialRemoval = features.reduce(
      (sum, feature) => sum + (feature.material_removal || 0),
      0
    );

    const complexityScore = this.calculateComplexityScore(features, geometry);

    const processingTime = performance.now() - startTime;

    return {
      features,
      summary: {
        total_features: features.length,
        feature_counts: featureCounts,
        total_material_removal: totalMaterialRemoval,
        complexity_score: complexityScore,
        dff_violations: dffViolations
      },
      metadata: {
        extraction_method: 'geometric_analysis',
        confidence_score: 0.85, // Mock confidence score
        processing_time_ms: processingTime,
        version: '1.0.0'
      }
    };
  }

  private async analyzeGeometry(
    geometry: any,
    materialCode: string,
    processCode: string
  ): Promise<FeatureProperties[]> {
    const features: FeatureProperties[] = [];

    // Analyze bounding box for basic feature detection
    const [x, y, z] = geometry.bbox_mm;

    // Detect holes based on volume/area ratios and process type
    if (processCode.includes('MILL') || processCode.includes('TURN')) {
      features.push(...this.detectHoles(geometry, materialCode));
    }

    // Detect pockets and cavities
    features.push(...this.detectPockets(geometry));

    // Detect bosses and protrusions
    features.push(...this.detectBosses(geometry));

    // Detect thin walls
    features.push(...this.detectThinWalls(geometry));

    // Detect threads (for turning operations)
    if (this.config.thread_detection && processCode.includes('TURN')) {
      features.push(...this.detectThreads(geometry));
    }

    // Detect undercuts
    if (this.config.undercut_detection) {
      features.push(...this.detectUndercuts(geometry));
    }

    return features;
  }

  private detectHoles(geometry: any, materialCode: string): FeatureProperties[] {
    const holes: FeatureProperties[] = [];
    const volume = geometry.volume_mm3;
    const surfaceArea = geometry.area_mm2;

    // More conservative hole detection based on surface area to volume ratio
    const surfaceToVolumeRatio = surfaceArea / volume;

    // Estimate number of holes based on ratio - much more conservative
    let estimatedHoleCount = 0;
    if (surfaceToVolumeRatio > 0.5) estimatedHoleCount = 3;
    else if (surfaceToVolumeRatio > 0.2) estimatedHoleCount = 2;
    else if (surfaceToVolumeRatio > 0.1) estimatedHoleCount = 1;

    // Only detect holes for larger parts
    if (volume < 1000) estimatedHoleCount = Math.min(estimatedHoleCount, 1);

    for (let i = 0; i < estimatedHoleCount; i++) {
      const diameter = this.estimateHoleDiameter(geometry.bbox_mm, i);
      if (diameter >= this.config.min_hole_diameter) {
        const depth = this.estimateHoleDepth(geometry.bbox_mm, diameter);

        holes.push({
          type: 'hole',
          location: {
            position: [
              (Math.random() - 0.5) * geometry.bbox_mm[0] * 0.8,
              (Math.random() - 0.5) * geometry.bbox_mm[1] * 0.8,
              geometry.bbox_mm[2] * 0.5 // Assume holes go through middle
            ]
          },
          dimensions: {
            diameter,
            depth
          },
          material_removal: Math.PI * Math.pow(diameter/2, 2) * depth,
          machining_difficulty: this.calculateHoleDifficulty(diameter, depth, materialCode),
          dff_issues: []
        });
      }
    }

    return holes;
  }

  private detectPockets(geometry: any): FeatureProperties[] {
    const pockets: FeatureProperties[] = [];

    // Estimate pockets based on volume distribution - more conservative
    const bboxVolume = geometry.bbox_mm[0] * geometry.bbox_mm[1] * geometry.bbox_mm[2];
    const packingRatio = geometry.volume_mm3 / bboxVolume;

    if (packingRatio < 0.7) { // More conservative threshold for cavities/pockets
      const pocketCount = Math.max(1, Math.floor((1 - packingRatio) * 2)); // Fewer pockets

      for (let i = 0; i < pocketCount; i++) {
        pockets.push({
          type: 'pocket',
          location: {
            position: [
              (Math.random() - 0.5) * geometry.bbox_mm[0] * 0.6,
              (Math.random() - 0.5) * geometry.bbox_mm[1] * 0.6,
              geometry.bbox_mm[2] * 0.3
            ]
          },
          dimensions: {
            width: geometry.bbox_mm[0] * 0.25, // Smaller pockets
            length: geometry.bbox_mm[1] * 0.25,
            depth: geometry.bbox_mm[2] * 0.15
          },
          material_removal: geometry.bbox_mm[0] * 0.25 * geometry.bbox_mm[1] * 0.25 * geometry.bbox_mm[2] * 0.15,
          machining_difficulty: 4,
          dff_issues: []
        });
      }
    }

    return pockets;
  }

  private detectBosses(geometry: any): FeatureProperties[] {
    const bosses: FeatureProperties[] = [];

    // Estimate bosses based on surface features - more conservative
    const surfaceComplexity = geometry.area_mm2 / (geometry.bbox_mm[0] * geometry.bbox_mm[1]);

    if (surfaceComplexity > 2.0) { // Higher threshold for complex surface suggesting bosses
      const bossCount = Math.floor(surfaceComplexity - 1.5); // Fewer bosses

      for (let i = 0; i < bossCount; i++) {
        bosses.push({
          type: 'boss',
          location: {
            position: [
              (Math.random() - 0.5) * geometry.bbox_mm[0] * 0.7,
              (Math.random() - 0.5) * geometry.bbox_mm[1] * 0.7,
              0
            ]
          },
          dimensions: {
            diameter: geometry.bbox_mm[0] * 0.12, // Smaller bosses
            height: geometry.bbox_mm[2] * 0.25
          },
          material_removal: 0, // Bosses add material, don't remove
          machining_difficulty: 3,
          dff_issues: []
        });
      }
    }

    return bosses;
  }

  private detectThinWalls(geometry: any): FeatureProperties[] {
    const walls: FeatureProperties[] = [];

    // Check for thin dimensions
    const minDimension = Math.min(...geometry.bbox_mm);

    if (minDimension < 2.0) { // Potentially thin wall
      walls.push({
        type: 'thin_wall',
        location: {
          position: [0, 0, geometry.bbox_mm[2] / 2]
        },
        dimensions: {
          height: minDimension,
          width: Math.max(...geometry.bbox_mm),
          length: geometry.bbox_mm[1]
        },
        material_removal: 0,
        machining_difficulty: minDimension < 1.0 ? 8 : 5,
        dff_issues: minDimension < 1.0 ? ['wall_too_thin'] : []
      });
    }

    return walls;
  }

  private detectThreads(geometry: any): FeatureProperties[] {
    const threads: FeatureProperties[] = [];

    // Conservative thread detection - only for very specific cylindrical parts
    const [x, y, z] = geometry.bbox_mm;

    // Only detect threads on long, uniform cylindrical parts with significant length
    if (x === y && z > x * 3 && x > 10) { // Very long cylindrical part, minimum diameter
      threads.push({
        type: 'thread',
        location: {
          position: [0, 0, z * 0.8] // Near the end
        },
        dimensions: {
          diameter: Math.min(x, y) * 0.9,
          length: z * 0.15 // Shorter thread length
        },
        thread_spec: {
          pitch: 1.5,
          type: 'metric',
          class: 'coarse'
        },
        material_removal: Math.PI * Math.pow(Math.min(x, y) * 0.9 / 2, 2) * z * 0.15 * 0.1, // Rough estimate
        machining_difficulty: 6,
        dff_issues: []
      });
    }

    return threads;
  }

  private detectUndercuts(geometry: any): FeatureProperties[] {
    const undercuts: FeatureProperties[] = [];

    // Simple undercut detection based on complex geometry
    const complexity = geometry.area_mm2 / (geometry.bbox_mm[0] * geometry.bbox_mm[1] * 2);

    if (complexity > 2.0) { // Very complex shape suggests undercuts
      undercuts.push({
        type: 'undercut',
        location: {
          position: [0, 0, geometry.bbox_mm[2] * 0.5]
        },
        dimensions: {
          radius: Math.min(...geometry.bbox_mm) * 0.2
        },
        material_removal: 0,
        machining_difficulty: 9,
        dff_issues: ['undercut_present']
      });
    }

    return undercuts;
  }

  private analyzeDFM(features: FeatureProperties[]): string[] {
    const violations: string[] = [];

    for (const feature of features) {
      const applicableRules = DFM_RULES.filter(rule => rule.feature_type === feature.type);

      for (const rule of applicableRules) {
        if (rule.condition(feature)) {
          violations.push(`${rule.severity}: ${rule.message}`);
        }
      }
    }

    return [...new Set(violations)]; // Remove duplicates
  }

  private calculateComplexityScore(features: FeatureProperties[], geometry: any): number {
    let score = 1;

    // Base score from feature count and types
    score += features.length * 0.5;

    // Difficulty multiplier
    const avgDifficulty = features.reduce((sum, f) => sum + f.machining_difficulty, 0) / Math.max(features.length, 1);
    score += avgDifficulty * 0.3;

    // Geometry complexity
    const aspectRatio = Math.max(...geometry.bbox_mm) / Math.min(...geometry.bbox_mm);
    score += Math.min(aspectRatio * 0.2, 2);

    // Material removal complexity
    const totalRemoval = features.reduce((sum, f) => sum + (f.material_removal || 0), 0);
    const removalRatio = totalRemoval / geometry.volume_mm3;
    score += Math.min(removalRatio * 5, 3);

    return Math.min(Math.max(score, 1), 10);
  }

  private estimateHoleDiameter(bbox: number[], index: number): number {
    const minDim = Math.min(...bbox);
    // Common hole sizes with some variation
    const commonSizes = [3, 5, 8, 10, 12, 16, 20];
    const baseSize = commonSizes[index % commonSizes.length];
    return Math.min(baseSize, minDim * 0.8);
  }

  private estimateHoleDepth(bbox: number[], diameter: number): number {
    const maxDepth = Math.max(...bbox);
    // Through holes or blind holes
    return Math.random() > 0.3 ? maxDepth : maxDepth * (0.3 + Math.random() * 0.4);
  }

  private calculateHoleDifficulty(diameter: number, depth: number, materialCode: string): number {
    let difficulty = 3; // Base difficulty

    // Small holes are harder
    if (diameter < 3) difficulty += 3;
    else if (diameter < 6) difficulty += 1;

    // Deep holes are harder
    const depthRatio = depth / diameter;
    if (depthRatio > 5) difficulty += 2;
    else if (depthRatio > 10) difficulty += 4;

    // Hard materials increase difficulty
    if (materialCode.includes('titanium') || materialCode.includes('stainless')) {
      difficulty += 1;
    }

    return Math.min(difficulty, 10);
  }
}