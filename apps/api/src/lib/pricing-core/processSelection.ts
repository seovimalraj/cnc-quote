import { Injectable, Logger } from '@nestjs/common';

export interface ProcessCandidate {
  code: string;
  name: string;
  family: 'milling' | 'turning' | 'sheet_metal' | 'injection_molding' | '3d_printing';
  confidence: number; // 0-1, how well this process fits
  reasoning: string[];
  limitations: string[];
  estimated_cost_multiplier: number; // relative to base CNC milling
}

export interface ProcessSelectionCriteria {
  geometry: {
    volume_cc: number;
    surface_area_cm2: number;
    bbox_mm: [number, number, number];
    aspect_ratio: number; // max/min dimension
  };
  features: {
    has_holes: boolean;
    has_threads: boolean;
    has_pockets: boolean;
    has_bosses: boolean;
    has_thin_walls: boolean;
    has_undercuts: boolean;
    total_features: number;
    complexity_score: number;
  };
  requirements: {
    material_code: string;
    quantity: number;
    tolerance_um: number;
    surface_finish: string | null;
  };
}

export interface ProcessRecommendation {
  recommended: ProcessCandidate;
  alternatives: ProcessCandidate[];
  analysis: {
    primary_driver: string;
    cost_impact: string;
    lead_time_impact: string;
    quality_notes: string[];
  };
}

@Injectable()
export class ProcessSelectionService {
  private readonly logger = new Logger(ProcessSelectionService.name);

  /**
   * Analyze part characteristics and recommend optimal manufacturing process
   */
  async selectProcess(criteria: ProcessSelectionCriteria): Promise<ProcessRecommendation> {
    const candidates = this.generateCandidates(criteria);
    const scored = this.scoreCandidates(candidates, criteria);
    const sorted = scored.sort((a, b) => b.confidence - a.confidence);

    const recommended = sorted[0];
    const alternatives = sorted.slice(1, 4); // Top 3 alternatives

    const analysis = this.analyzeRecommendation(recommended, criteria);

    return {
      recommended,
      alternatives,
      analysis
    };
  }

  private generateCandidates(criteria: ProcessSelectionCriteria): ProcessCandidate[] {
    const candidates: ProcessCandidate[] = [];

    // CNC Milling (versatile baseline)
    candidates.push({
      code: 'CNC-MILL-3AX',
      name: '3-Axis CNC Milling',
      family: 'milling',
      confidence: 0.8, // Good baseline
      reasoning: ['Versatile for complex geometries', 'Good for prototypes and low volumes'],
      limitations: ['Limited to 3-axis movement', 'May require multiple setups'],
      estimated_cost_multiplier: 1.0
    });

    candidates.push({
      code: 'CNC-MILL-5AX',
      name: '5-Axis CNC Milling',
      family: 'milling',
      confidence: 0.6,
      reasoning: ['Excellent for complex 3D shapes', 'Single setup for complex parts'],
      limitations: ['Higher cost', 'Requires specialized equipment'],
      estimated_cost_multiplier: 1.8
    });

    // CNC Turning
    candidates.push({
      code: 'CNC-TURN',
      name: 'CNC Turning',
      family: 'turning',
      confidence: 0.4,
      reasoning: ['Excellent for cylindrical parts', 'Very efficient for round features'],
      limitations: ['Limited to rotational geometries', 'Secondary operations needed for complex features'],
      estimated_cost_multiplier: 0.7
    });

    // Sheet Metal
    candidates.push({
      code: 'SHEET-METAL',
      name: 'Sheet Metal Fabrication',
      family: 'sheet_metal',
      confidence: 0.3,
      reasoning: ['Cost-effective for thin parts', 'Fast for simple geometries'],
      limitations: ['Limited thickness range', 'Design constraints for bends and forms'],
      estimated_cost_multiplier: 0.6
    });

    // Injection Molding
    candidates.push({
      code: 'INJECTION-MOLD',
      name: 'Injection Molding',
      family: 'injection_molding',
      confidence: 0.2,
      reasoning: ['Best for high volume production', 'Excellent surface finish'],
      limitations: ['High upfront tooling cost', 'Only economical at scale'],
      estimated_cost_multiplier: 0.3 // Per part cost, but high NRE
    });

    // 3D Printing
    candidates.push({
      code: 'SLA-3D',
      name: 'SLA 3D Printing',
      family: '3d_printing',
      confidence: 0.5,
      reasoning: ['No tooling required', 'Excellent for complex geometries'],
      limitations: ['Limited material options', 'Slower than traditional methods'],
      estimated_cost_multiplier: 1.2
    });

    return candidates;
  }

  private scoreCandidates(candidates: ProcessCandidate[], criteria: ProcessSelectionCriteria): ProcessCandidate[] {
    return candidates.map(candidate => {
      let confidence = candidate.confidence;
      const reasoning: string[] = [...candidate.reasoning];
      const limitations: string[] = [...candidate.limitations];

      // Geometry-based scoring
      const geom = criteria.geometry;

      switch (candidate.family) {
        case 'turning':
          // Favor turning for cylindrical parts
          if (geom.aspect_ratio > 3) {
            confidence += 0.3;
            reasoning.push('High aspect ratio favors turning');
          } else if (geom.aspect_ratio < 1.5) {
            confidence -= 0.2;
            limitations.push('Low aspect ratio not ideal for turning');
          }
          break;

        case 'sheet_metal': {
          // Favor sheet metal for thin, flat parts
          const thickness = Math.min(...geom.bbox_mm);
          if (thickness < 3) {
            confidence += 0.4;
            reasoning.push('Thin material suitable for sheet metal');
          }
          if (geom.aspect_ratio < 2) {
            confidence += 0.2;
            reasoning.push('Flat geometry well-suited for sheet metal');
          }
          break;
        }

        case 'injection_molding':
          // Only viable for high volume
          if (criteria.requirements.quantity < 100) {
            confidence -= 0.5;
            limitations.push('Low volume makes injection molding uneconomical');
          } else if (criteria.requirements.quantity > 1000) {
            confidence += 0.3;
            reasoning.push('High volume justifies injection molding investment');
          }
          break;

        case '3d_printing':
          // Good for complex geometries
          if (criteria.features.complexity_score > 7) {
            confidence += 0.3;
            reasoning.push('High complexity benefits from additive manufacturing');
          }
          if (criteria.requirements.tolerance_um > 100) {
            confidence += 0.2;
            reasoning.push('Relaxed tolerances suitable for 3D printing');
          }
          break;

        case 'milling':
          // Milling is versatile but adjust based on features
          if (criteria.features.has_undercuts) {
            // 5-axis better for undercuts
            if (candidate.code.includes('5AX')) {
              confidence += 0.4;
              reasoning.push('5-axis milling required for undercuts');
            } else {
              confidence -= 0.2;
              limitations.push('3-axis milling limited with undercuts');
            }
          }
          break;
      }

      // Feature-based adjustments
      const features = criteria.features;

      if (features.has_threads && candidate.family === 'turning') {
        confidence += 0.2;
        reasoning.push('Threading is efficient on lathes');
      }

      if (features.has_thin_walls && candidate.family === 'sheet_metal') {
        confidence += 0.3;
        reasoning.push('Thin walls well-suited for sheet metal');
      }

      // Material considerations
      const material = criteria.requirements.material_code.toLowerCase();
      if (material.includes('aluminum') || material.includes('steel')) {
        // Good for most processes
      } else if (material.includes('plastic') && candidate.family === 'injection_molding') {
        confidence += 0.2;
        reasoning.push('Plastic material ideal for injection molding');
      }

      // Tolerance adjustments
      const tolerance = criteria.requirements.tolerance_um;
      if (tolerance < 50 && candidate.family === 'milling') {
        confidence += 0.1;
        reasoning.push('Tight tolerances achievable with CNC milling');
      }

      // Clamp confidence between 0 and 1
      confidence = Math.max(0, Math.min(1, confidence));

      return {
        ...candidate,
        confidence,
        reasoning,
        limitations
      };
    });
  }

  private analyzeRecommendation(
    recommended: ProcessCandidate,
    criteria: ProcessSelectionCriteria
  ): ProcessRecommendation['analysis'] {
    const primaryDriver = this.determinePrimaryDriver(recommended, criteria);
    const costImpact = this.estimateCostImpact(recommended, criteria);
    const leadTimeImpact = this.estimateLeadTimeImpact(recommended, criteria);
    const qualityNotes = this.generateQualityNotes(recommended, criteria);

    return {
      primary_driver: primaryDriver,
      cost_impact: costImpact,
      lead_time_impact: leadTimeImpact,
      quality_notes: qualityNotes
    };
  }

  private determinePrimaryDriver(recommended: ProcessCandidate, criteria: ProcessSelectionCriteria): string {
    const geom = criteria.geometry;
    const features = criteria.features;

    if (geom.aspect_ratio > 4 && recommended.family === 'turning') {
      return 'High aspect ratio cylindrical geometry';
    }

    if (Math.min(...geom.bbox_mm) < 2 && recommended.family === 'sheet_metal') {
      return 'Thin material cross-section';
    }

    if (features.complexity_score > 8 && recommended.family === '3d_printing') {
      return 'High geometric complexity';
    }

    if (criteria.requirements.quantity > 500 && recommended.family === 'injection_molding') {
      return 'High production volume';
    }

    if (features.has_undercuts && recommended.code.includes('5AX')) {
      return 'Complex undercuts requiring 5-axis machining';
    }

    return 'Balanced capability for requirements';
  }

  private estimateCostImpact(recommended: ProcessCandidate, criteria: ProcessSelectionCriteria): string {
    const multiplier = recommended.estimated_cost_multiplier;

    if (multiplier < 0.8) {
      return `~${Math.round((1 - multiplier) * 100)}% cost savings vs CNC milling`;
    } else if (multiplier > 1.2) {
      return `~${Math.round((multiplier - 1) * 100)}% cost premium vs CNC milling`;
    }

    return 'Comparable cost to CNC milling';
  }

  private estimateLeadTimeImpact(recommended: ProcessCandidate, criteria: ProcessSelectionCriteria): string {
    switch (recommended.family) {
      case 'sheet_metal':
        return 'Fastest lead time (1-3 days)';
      case 'turning':
        return 'Fast lead time (2-5 days)';
      case 'milling':
        return 'Standard lead time (3-7 days)';
      case '3d_printing':
        return 'Medium lead time (2-5 days)';
      case 'injection_molding':
        return criteria.requirements.quantity > 1000 ? 'Long lead time (2-4 weeks)' : 'Very long lead time (4-8 weeks)';
      default:
        return 'Standard lead time';
    }
  }

  private generateQualityNotes(recommended: ProcessCandidate, criteria: ProcessSelectionCriteria): string[] {
    const notes: string[] = [];

    const tolerance = criteria.requirements.tolerance_um;

    switch (recommended.family) {
      case 'milling':
        notes.push('Excellent dimensional accuracy and surface finish');
        if (tolerance < 25) notes.push('Capable of tight tolerances with proper fixturing');
        break;
      case 'turning':
        notes.push('Excellent roundness and concentricity');
        notes.push('May require secondary operations for complex features');
        break;
      case 'sheet_metal':
        notes.push('Good for flat patterns and simple bends');
        notes.push('Surface finish depends on material and coating');
        break;
      case 'injection_molding':
        notes.push('Excellent surface finish and consistency at scale');
        notes.push('High upfront tooling investment required');
        break;
      case '3d_printing':
        notes.push('Good for complex geometries without tooling');
        if (tolerance > 100) notes.push('Relaxed tolerances typical for additive processes');
        break;
    }

    return notes;
  }
}