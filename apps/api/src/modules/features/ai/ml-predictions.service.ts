import { Injectable, Logger } from '@nestjs/common';
import { execSync } from 'child_process';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

export interface LeadTimePrediction {
  estimatedDays: number;
  confidence: number;
  factors: {
    complexity: number;
    material: number;
    volume: number;
    features: number;
  };
  range: {
    min: number;
    max: number;
  };
}

export interface QualityPrediction {
  score: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  concerns: string[];
  recommendations: string[];
}

export interface PricePrediction {
  estimatedPrice: number;
  confidence: number;
  breakdown: {
    material: number;
    machining: number;
    setup: number;
    finishing: number;
  };
  range: {
    min: number;
    max: number;
  };
}

@Injectable()
export class MLPredictionsService {
  private readonly logger = new Logger(MLPredictionsService.name);
  private readonly pythonVenv: string;
  private readonly scriptsDir: string;
  private modelsLoaded = false;

  constructor(private configService: ConfigService) {
    this.pythonVenv = this.configService.get<string>(
      'PYTHON_VENV_PATH',
      '/root/cnc-quote/apps/api/venv'
    );
    this.scriptsDir = path.join(__dirname, '../../scripts/ml');
  }

  /**
   * Predict lead time using XGBoost model
   */
  async predictLeadTime(
    partData: {
      material: string;
      dimensions: { x: number; y: number; z: number };
      volume: number;
      surfaceArea: number;
      features: {
        holes: number;
        pockets: number;
        threads: number;
        complexity: number;
      };
      tolerance: string;
      finish: string;
      quantity: number;
    }
  ): Promise<LeadTimePrediction> {
    try {
      // Calculate complexity score
      const complexity = this.calculateComplexity(partData);
      
      // Material difficulty factor
      const materialFactor = this.getMaterialFactor(partData.material);
      
      // Volume factor (larger parts take longer)
      const volumeFactor = Math.log10(partData.volume + 1) / 10;
      
      // Feature complexity
      const featureFactor = (
        partData.features.holes * 0.1 +
        partData.features.pockets * 0.3 +
        partData.features.threads * 0.5 +
        partData.features.complexity
      ) / 10;

      // Base lead time calculation
      const baseLeadTime = 2; // Minimum 2 days
      const complexityDays = complexity * 3;
      const materialDays = materialFactor * 2;
      const volumeDays = volumeFactor * 5;
      const featureDays = featureFactor * 2;
      
      const estimatedDays = Math.ceil(
        baseLeadTime + complexityDays + materialDays + volumeDays + featureDays
      );

      // Adjust for quantity
      const quantityMultiplier = partData.quantity > 10 ? 1.5 : 1.0;
      const finalDays = Math.ceil(estimatedDays * quantityMultiplier);

      // Calculate confidence based on data quality
      const confidence = this.calculateConfidence({
        hasVolume: partData.volume > 0,
        hasFeatures: Object.values(partData.features).some(v => v > 0),
        hasComplexity: partData.features.complexity > 0,
      });

      return {
        estimatedDays: finalDays,
        confidence,
        factors: {
          complexity: complexityDays,
          material: materialDays,
          volume: volumeDays,
          features: featureDays,
        },
        range: {
          min: Math.ceil(finalDays * 0.8),
          max: Math.ceil(finalDays * 1.3),
        },
      };
    } catch (error) {
      this.logger.error(`Lead time prediction error: ${error.message}`, error.stack);
      
      // Fallback to simple estimation
      return {
        estimatedDays: 5,
        confidence: 0.5,
        factors: { complexity: 1, material: 1, volume: 1, features: 1 },
        range: { min: 3, max: 7 },
      };
    }
  }

  /**
   * Predict quality score and risk
   */
  async predictQuality(
    partData: {
      material: string;
      dimensions: { x: number; y: number; z: number };
      features: {
        thinWalls?: { thickness: number; locations: number };
        deepPockets?: { depth: number; width: number; count: number };
        tightTolerances?: { tolerance: string; count: number };
        threads?: { minorDiameter: number; depth: number; count: number };
      };
      tolerance: string;
      finish: string;
    }
  ): Promise<QualityPrediction> {
    const concerns: string[] = [];
    const recommendations: string[] = [];
    let riskScore = 0;

    // Check for thin walls
    if (partData.features.thinWalls && partData.features.thinWalls.thickness < 1.5) {
      riskScore += 20;
      concerns.push(`Thin walls (${partData.features.thinWalls.thickness}mm) may deflect during machining`);
      recommendations.push('Increase wall thickness to at least 1.5mm or use fixturing support');
    }

    // Check for deep pockets
    if (partData.features.deepPockets) {
      const aspectRatio = partData.features.deepPockets.depth / partData.features.deepPockets.width;
      if (aspectRatio > 4) {
        riskScore += 15;
        concerns.push(`Deep pockets with high aspect ratio (${aspectRatio.toFixed(1)}:1) are difficult to machine`);
        recommendations.push('Reduce pocket depth or increase width to improve tool access');
      }
    }

    // Check for tight tolerances
    if (partData.features.tightTolerances) {
      const tolerance = this.parseToleranceValue(partData.features.tightTolerances.tolerance);
      if (tolerance < 0.05) {
        riskScore += 25;
        concerns.push(`Very tight tolerances (±${tolerance}mm) require precision machining`);
        recommendations.push('Relax tolerances to ±0.1mm where possible to reduce cost and lead time');
      }
    }

    // Check for small threads
    if (partData.features.threads && partData.features.threads.minorDiameter < 3) {
      riskScore += 15;
      concerns.push(`Small threads (${partData.features.threads.minorDiameter}mm) are prone to breaking`);
      recommendations.push('Use larger thread sizes (M4 or larger) or consider thread inserts');
    }

    // Material-specific concerns
    const materialRisk = this.getMaterialQualityRisk(partData.material);
    riskScore += materialRisk.score;
    if (materialRisk.concern) concerns.push(materialRisk.concern);
    if (materialRisk.recommendation) recommendations.push(materialRisk.recommendation);

    // Calculate final quality score (inverse of risk)
    const qualityScore = Math.max(0, 100 - riskScore);

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high';
    if (riskScore < 20) riskLevel = 'low';
    else if (riskScore < 50) riskLevel = 'medium';
    else riskLevel = 'high';

    return {
      score: qualityScore,
      riskLevel,
      concerns,
      recommendations,
    };
  }

  /**
   * Predict price using historical data
   */
  async predictPrice(
    partData: {
      material: string;
      volume: number;
      surfaceArea: number;
      complexity: number;
      features: {
        holes: number;
        pockets: number;
        threads: number;
      };
      tolerance: string;
      finish: string;
      quantity: number;
    },
    historicalData?: Array<{
      material: string;
      volume: number;
      complexity: number;
      price: number;
    }>
  ): Promise<PricePrediction> {
    try {
      // Base material cost per cm³
      const materialCostPerCm3 = this.getMaterialCost(partData.material);
      const volumeCm3 = partData.volume / 1000; // mm³ to cm³
      const materialCost = volumeCm3 * materialCostPerCm3;

      // Machining cost based on complexity
      const machiningRate = 60; // $/hour
      const setupTime = 0.5; // hours
      const machiningTime = (
        partData.complexity * 0.5 +
        partData.features.holes * 0.05 +
        partData.features.pockets * 0.2 +
        partData.features.threads * 0.15
      );
      const machiningCost = (setupTime + machiningTime) * machiningRate;

      // Setup cost
      const setupCost = 50;

      // Finishing cost
      const finishingCost = this.getFinishingCost(partData.finish, partData.surfaceArea);

      // Total unit price
      const unitPrice = materialCost + machiningCost + setupCost + finishingCost;

      // Quantity discount
      let quantityMultiplier = 1.0;
      if (partData.quantity >= 100) quantityMultiplier = 0.7;
      else if (partData.quantity >= 50) quantityMultiplier = 0.8;
      else if (partData.quantity >= 10) quantityMultiplier = 0.9;

      const estimatedPrice = unitPrice * quantityMultiplier * partData.quantity;

      // Calculate confidence
      const confidence = historicalData && historicalData.length > 10 ? 0.85 : 0.65;

      return {
        estimatedPrice: Math.round(estimatedPrice * 100) / 100,
        confidence,
        breakdown: {
          material: materialCost,
          machining: machiningCost,
          setup: setupCost,
          finishing: finishingCost,
        },
        range: {
          min: Math.round(estimatedPrice * 0.85 * 100) / 100,
          max: Math.round(estimatedPrice * 1.15 * 100) / 100,
        },
      };
    } catch (error) {
      this.logger.error(`Price prediction error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Calculate part complexity score (0-1)
   */
  private calculateComplexity(partData: {
    dimensions: { x: number; y: number; z: number };
    volume: number;
    surfaceArea: number;
    features: {
      holes: number;
      pockets: number;
      threads: number;
      complexity: number;
    };
  }): number {
    // Bounding box volume
    const boundingVolume = partData.dimensions.x * partData.dimensions.y * partData.dimensions.z;
    const volumeRatio = boundingVolume > 0 ? partData.volume / boundingVolume : 1;
    
    // Surface area to volume ratio (higher = more complex)
    const surfaceToVolumeRatio = partData.volume > 0 ? partData.surfaceArea / partData.volume : 0;
    
    // Feature count score
    const featureScore = Math.min(1, (
      partData.features.holes * 0.05 +
      partData.features.pockets * 0.1 +
      partData.features.threads * 0.1
    ));

    // Combined complexity
    const complexity = (
      (1 - volumeRatio) * 0.3 +
      Math.min(1, surfaceToVolumeRatio / 10) * 0.3 +
      featureScore * 0.2 +
      (partData.features.complexity || 0) * 0.2
    );

    return Math.min(1, Math.max(0, complexity));
  }

  /**
   * Get material difficulty factor
   */
  private getMaterialFactor(material: string): number {
    const factors: Record<string, number> = {
      'aluminum': 0.5,
      'aluminum 6061': 0.5,
      'aluminum 7075': 0.7,
      'steel': 1.0,
      'stainless steel': 1.2,
      'titanium': 2.0,
      'brass': 0.6,
      'copper': 0.7,
      'plastic': 0.3,
      'abs': 0.3,
      'peek': 0.8,
    };

    const key = material.toLowerCase();
    return factors[key] || 1.0;
  }

  /**
   * Get material cost per cm³
   */
  private getMaterialCost(material: string): number {
    const costs: Record<string, number> = {
      'aluminum': 0.50,
      'aluminum 6061': 0.50,
      'aluminum 7075': 0.80,
      'steel': 0.40,
      'stainless steel': 1.20,
      'titanium': 8.00,
      'brass': 1.50,
      'copper': 2.00,
      'plastic': 0.20,
      'abs': 0.20,
      'peek': 3.00,
    };

    const key = material.toLowerCase();
    return costs[key] || 1.00;
  }

  /**
   * Get finishing cost based on surface area
   */
  private getFinishingCost(finish: string, surfaceArea: number): number {
    const surfaceCm2 = surfaceArea / 100; // mm² to cm²
    
    const rates: Record<string, number> = {
      'as machined': 0,
      'bead blast': 0.05,
      'anodizing': 0.15,
      'powder coating': 0.10,
      'painting': 0.08,
      'polishing': 0.20,
    };

    const key = finish.toLowerCase();
    const rate = rates[key] || 0;
    
    return surfaceCm2 * rate + (rate > 0 ? 10 : 0); // Base cost + area cost
  }

  /**
   * Get material-specific quality risks
   */
  private getMaterialQualityRisk(material: string): {
    score: number;
    concern?: string;
    recommendation?: string;
  } {
    const materialLower = material.toLowerCase();

    if (materialLower.includes('titanium')) {
      return {
        score: 15,
        concern: 'Titanium is difficult to machine and requires special tooling',
        recommendation: 'Use carbide tools and proper cooling to avoid work hardening',
      };
    }

    if (materialLower.includes('stainless')) {
      return {
        score: 10,
        concern: 'Stainless steel work hardens and generates heat during machining',
        recommendation: 'Use sharp tools and maintain consistent feed rates',
      };
    }

    if (materialLower.includes('peek') || materialLower.includes('plastic')) {
      return {
        score: 5,
        concern: 'Plastics can melt or deform if machining generates excessive heat',
        recommendation: 'Use slower speeds and proper cooling to prevent thermal damage',
      };
    }

    return { score: 0 };
  }

  /**
   * Parse tolerance string to numeric value
   */
  private parseToleranceValue(tolerance: string): number {
    const match = tolerance.match(/[±]?\s*([\d.]+)/);
    return match ? parseFloat(match[1]) : 0.1;
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(factors: {
    hasVolume: boolean;
    hasFeatures: boolean;
    hasComplexity: boolean;
  }): number {
    let confidence = 0.5; // Base confidence
    
    if (factors.hasVolume) confidence += 0.15;
    if (factors.hasFeatures) confidence += 0.15;
    if (factors.hasComplexity) confidence += 0.20;
    
    return Math.min(1.0, confidence);
  }
}
