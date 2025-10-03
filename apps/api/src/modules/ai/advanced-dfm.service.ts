import { Injectable, Logger } from '@nestjs/common';
import { AIOrchestrator } from '../ai/ai-orchestrator.service';
import { OllamaService } from '../ai/ollama.service';
import { MLPredictionsService } from '../ai/ml-predictions.service';

/**
 * Material properties database
 */
export interface MaterialProperties {
  name: string;
  category: 'metal' | 'plastic' | 'composite';
  
  // Mechanical properties
  tensileStrength: number; // MPa
  yieldStrength: number; // MPa
  hardness: number; // Brinell/Rockwell equivalent
  elasticModulus: number; // GPa
  density: number; // g/cm³
  
  // Manufacturing properties
  machinability: number; // 0-100 (higher = easier)
  weldability?: number; // 0-100
  corrosionResistance: number; // 0-100
  
  // Cost factors
  relativeCost: number; // 1 = aluminum 6061 baseline
  availability: number; // 0-100
  
  // Thermal properties
  meltingPoint?: number; // °C
  thermalConductivity: number; // W/m·K
  
  // Common applications
  applications: string[];
  
  // DFM considerations
  minWallThickness: number; // mm
  recommendedTolerance: string; // e.g., "±0.1mm"
  surfaceFinishOptions: string[];
  
  // Special properties
  foodSafe?: boolean;
  biocompatible?: boolean;
  electricallyConductive?: boolean;
}

/**
 * Advanced DFM analysis result with AI insights
 */
export interface AdvancedDfmAnalysis {
  // Overall scores
  manufacturabilityScore: number; // 0-100
  costEfficiency: number; // 0-100
  qualityRisk: 'low' | 'medium' | 'high';
  
  // Material analysis
  materialAnalysis: {
    currentMaterial: string;
    isOptimal: boolean;
    alternatives: Array<{
      material: string;
      reason: string;
      costImpact: number; // percentage
      performanceImpact: string;
      score: number; // 0-100
    }>;
    compatibilityIssues: string[];
  };
  
  // Feature analysis
  featureAnalysis: {
    holes: Array<{
      id: string;
      diameter: number;
      depth: number;
      issues: string[];
      suggestions: string[];
      toolingCost: 'low' | 'medium' | 'high';
    }>;
    pockets: Array<{
      id: string;
      depth: number;
      width: number;
      aspectRatio: number;
      issues: string[];
      suggestions: string[];
      toolingDifficulty: number; // 0-100
    }>;
    threads: Array<{
      id: string;
      size: string;
      depth: number;
      issues: string[];
      suggestions: string[];
    }>;
    thinWalls: Array<{
      location: string;
      thickness: number;
      issues: string[];
      suggestions: string[];
      risk: 'low' | 'medium' | 'high';
    }>;
  };
  
  // Tolerance analysis
  toleranceAnalysis: {
    current: string;
    isRealistic: boolean;
    recommendations: string[];
    costImpact: string;
    alternativeTolerance?: string;
    savings?: number; // percentage
  };
  
  // Process recommendations
  processRecommendations: {
    primaryProcess: string;
    secondaryProcesses: string[];
    toolingRequirements: string[];
    estimatedSetupTime: number; // hours
    estimatedMachiningTime: number; // hours
    fixtureComplexity: 'simple' | 'moderate' | 'complex';
  };
  
  // Cost optimization
  costOptimization: {
    currentEstimate: number;
    optimizedEstimate: number;
    potentialSavings: number; // percentage
    recommendations: Array<{
      category: 'material' | 'tolerance' | 'finish' | 'design' | 'quantity';
      suggestion: string;
      impact: number; // percentage cost reduction
      effort: 'low' | 'medium' | 'high';
    }>;
  };
  
  // AI insights
  aiInsights: {
    summary: string;
    criticalIssues: string[];
    quickWins: string[];
    longTermSuggestions: string[];
  };
}

@Injectable()
export class AdvancedDfmService {
  private readonly logger = new Logger(AdvancedDfmService.name);
  private materialsDatabase: Map<string, MaterialProperties>;

  constructor(
    private readonly aiOrchestrator: AIOrchestrator,
    private readonly ollamaService: OllamaService,
    private readonly mlPredictions: MLPredictionsService
  ) {
    this.initializeMaterialsDatabase();
  }

  /**
   * Initialize comprehensive materials database
   */
  private initializeMaterialsDatabase() {
    this.materialsDatabase = new Map<string, MaterialProperties>();

    // Aluminum alloys
    this.materialsDatabase.set('Aluminum 6061', {
      name: 'Aluminum 6061',
      category: 'metal',
      tensileStrength: 310,
      yieldStrength: 276,
      hardness: 95,
      elasticModulus: 68.9,
      density: 2.70,
      machinability: 90,
      weldability: 85,
      corrosionResistance: 75,
      relativeCost: 1.0,
      availability: 95,
      thermalConductivity: 167,
      applications: ['General purpose', 'Structural', 'Automotive', 'Marine'],
      minWallThickness: 0.8,
      recommendedTolerance: '±0.1mm',
      surfaceFinishOptions: ['As machined', 'Bead blast', 'Anodizing', 'Powder coating'],
      foodSafe: true,
    });

    this.materialsDatabase.set('Aluminum 7075', {
      name: 'Aluminum 7075',
      category: 'metal',
      tensileStrength: 572,
      yieldStrength: 503,
      hardness: 150,
      elasticModulus: 71.7,
      density: 2.81,
      machinability: 70,
      weldability: 20,
      corrosionResistance: 60,
      relativeCost: 1.6,
      availability: 80,
      thermalConductivity: 130,
      applications: ['Aerospace', 'High strength', 'Racing', 'Defense'],
      minWallThickness: 1.0,
      recommendedTolerance: '±0.05mm',
      surfaceFinishOptions: ['As machined', 'Anodizing', 'Hard anodizing'],
    });

    this.materialsDatabase.set('Aluminum 2024', {
      name: 'Aluminum 2024',
      category: 'metal',
      tensileStrength: 469,
      yieldStrength: 324,
      hardness: 120,
      elasticModulus: 73.1,
      density: 2.78,
      machinability: 75,
      weldability: 30,
      corrosionResistance: 50,
      relativeCost: 1.4,
      availability: 75,
      thermalConductivity: 121,
      applications: ['Aerospace', 'Aircraft structures', 'Military'],
      minWallThickness: 1.0,
      recommendedTolerance: '±0.1mm',
      surfaceFinishOptions: ['As machined', 'Anodizing', 'Alodine'],
    });

    // Stainless steel
    this.materialsDatabase.set('Stainless Steel 304', {
      name: 'Stainless Steel 304',
      category: 'metal',
      tensileStrength: 505,
      yieldStrength: 215,
      hardness: 70,
      elasticModulus: 193,
      density: 8.00,
      machinability: 60,
      weldability: 90,
      corrosionResistance: 85,
      relativeCost: 2.5,
      availability: 95,
      thermalConductivity: 16.2,
      applications: ['Food processing', 'Chemical', 'Medical', 'Marine'],
      minWallThickness: 1.5,
      recommendedTolerance: '±0.15mm',
      surfaceFinishOptions: ['As machined', 'Bead blast', 'Electropolish', 'Passivation'],
      foodSafe: true,
    });

    this.materialsDatabase.set('Stainless Steel 316', {
      name: 'Stainless Steel 316',
      category: 'metal',
      tensileStrength: 515,
      yieldStrength: 205,
      hardness: 79,
      elasticModulus: 193,
      density: 8.00,
      machinability: 55,
      weldability: 90,
      corrosionResistance: 95,
      relativeCost: 3.0,
      availability: 90,
      thermalConductivity: 16.3,
      applications: ['Marine', 'Medical', 'Chemical', 'Pharmaceutical'],
      minWallThickness: 1.5,
      recommendedTolerance: '±0.15mm',
      surfaceFinishOptions: ['As machined', 'Electropolish', 'Passivation'],
      foodSafe: true,
      biocompatible: true,
    });

    // Steel
    this.materialsDatabase.set('Mild Steel 1018', {
      name: 'Mild Steel 1018',
      category: 'metal',
      tensileStrength: 440,
      yieldStrength: 370,
      hardness: 126,
      elasticModulus: 205,
      density: 7.87,
      machinability: 85,
      weldability: 95,
      corrosionResistance: 20,
      relativeCost: 0.8,
      availability: 95,
      thermalConductivity: 51.9,
      applications: ['General purpose', 'Structural', 'Low-cost prototypes'],
      minWallThickness: 2.0,
      recommendedTolerance: '±0.2mm',
      surfaceFinishOptions: ['As machined', 'Painting', 'Powder coating', 'Zinc plating'],
    });

    // Titanium
    this.materialsDatabase.set('Titanium Grade 5', {
      name: 'Titanium Grade 5',
      category: 'metal',
      tensileStrength: 895,
      yieldStrength: 828,
      hardness: 36,
      elasticModulus: 113.8,
      density: 4.43,
      machinability: 30,
      weldability: 60,
      corrosionResistance: 99,
      relativeCost: 15.0,
      availability: 60,
      thermalConductivity: 6.7,
      applications: ['Aerospace', 'Medical implants', 'Racing', 'Chemical processing'],
      minWallThickness: 1.5,
      recommendedTolerance: '±0.1mm',
      surfaceFinishOptions: ['As machined', 'Bead blast', 'Anodizing'],
      biocompatible: true,
    });

    // Brass
    this.materialsDatabase.set('Brass C360', {
      name: 'Brass C360',
      category: 'metal',
      tensileStrength: 470,
      yieldStrength: 200,
      hardness: 80,
      elasticModulus: 97,
      density: 8.50,
      machinability: 100,
      weldability: 50,
      corrosionResistance: 70,
      relativeCost: 3.5,
      availability: 85,
      thermalConductivity: 115,
      applications: ['Decorative', 'Electrical', 'Plumbing', 'Musical instruments'],
      minWallThickness: 1.0,
      recommendedTolerance: '±0.1mm',
      surfaceFinishOptions: ['As machined', 'Polishing', 'Plating'],
      electricallyConductive: true,
    });

    // Plastics
    this.materialsDatabase.set('ABS', {
      name: 'ABS',
      category: 'plastic',
      tensileStrength: 40,
      yieldStrength: 35,
      hardness: 50,
      elasticModulus: 2.3,
      density: 1.05,
      machinability: 95,
      corrosionResistance: 80,
      relativeCost: 0.3,
      availability: 95,
      meltingPoint: 105,
      thermalConductivity: 0.17,
      applications: ['Consumer products', 'Automotive', 'Electronics', 'Prototypes'],
      minWallThickness: 1.0,
      recommendedTolerance: '±0.2mm',
      surfaceFinishOptions: ['As machined', 'Painting', 'Vapor smoothing'],
    });

    this.materialsDatabase.set('PEEK', {
      name: 'PEEK',
      category: 'plastic',
      tensileStrength: 100,
      yieldStrength: 90,
      hardness: 40,
      elasticModulus: 3.6,
      density: 1.32,
      machinability: 70,
      corrosionResistance: 95,
      relativeCost: 12.0,
      availability: 70,
      meltingPoint: 343,
      thermalConductivity: 0.25,
      applications: ['Medical', 'Aerospace', 'Automotive', 'Chemical processing'],
      minWallThickness: 0.5,
      recommendedTolerance: '±0.15mm',
      surfaceFinishOptions: ['As machined'],
      biocompatible: true,
    });

    this.logger.log(`Initialized materials database with ${this.materialsDatabase.size} materials`);
  }

  /**
   * Get material properties
   */
  getMaterial(materialName: string): MaterialProperties | undefined {
    // Try exact match first
    let material = this.materialsDatabase.get(materialName);
    
    if (!material) {
      // Try partial match (case-insensitive)
      const normalizedName = materialName.toLowerCase();
      for (const [key, value] of this.materialsDatabase.entries()) {
        if (key.toLowerCase().includes(normalizedName) || normalizedName.includes(key.toLowerCase())) {
          material = value;
          break;
        }
      }
    }
    
    return material;
  }

  /**
   * Get all available materials
   */
  getAllMaterials(): MaterialProperties[] {
    return Array.from(this.materialsDatabase.values());
  }

  /**
   * Comprehensive DFM analysis with AI/ML
   */
  async analyzePartAdvanced(
    partData: {
      name: string;
      material: string;
      dimensions: { x: number; y: number; z: number };
      volume: number;
      surfaceArea: number;
      features: {
        holes?: Array<{ id: string; diameter: number; depth: number; position?: any }>;
        pockets?: Array<{ id: string; depth: number; width: number; position?: any }>;
        threads?: Array<{ id: string; size: string; depth: number; type?: string }>;
        thinWalls?: Array<{ location: string; thickness: number }>;
        complexity: number;
      };
      tolerance: string;
      finish: string;
      quantity: number;
      process: string;
      application?: string;
    }
  ): Promise<AdvancedDfmAnalysis> {
    this.logger.log(`Starting advanced DFM analysis for: ${partData.name}`);

    try {
      // Run parallel analyses
      const [
        materialAnalysisResult,
        featureAnalysisResult,
        toleranceAnalysisResult,
        processRecommendationsResult,
        aiAnalysisResult,
        mlPredictions,
      ] = await Promise.all([
        this.analyzeMaterial(partData),
        this.analyzeFeatures(partData),
        this.analyzeTolerance(partData),
        this.recommendProcess(partData),
        this.aiOrchestrator.analyzePartComplete({
          ...partData,
          features: {
            holes: partData.features.holes?.length || 0,
            pockets: partData.features.pockets?.length || 0,
            threads: partData.features.threads?.length || 0,
            thinWalls: partData.features.thinWalls?.[0]
              ? { thickness: partData.features.thinWalls[0].thickness, locations: partData.features.thinWalls.length }
              : undefined,
            complexity: partData.features.complexity,
          },
        }),
        this.mlPredictions.predictQuality({
          material: partData.material,
          dimensions: partData.dimensions,
          features: partData.features.thinWalls?.[0]
            ? {
                thinWalls: {
                  thickness: partData.features.thinWalls[0].thickness,
                  locations: partData.features.thinWalls.length,
                },
              }
            : {},
          tolerance: partData.tolerance,
          finish: partData.finish,
        }),
      ]);

      // Calculate cost optimization
      const costOptimization = await this.analyzeCostOptimization(
        partData,
        materialAnalysisResult,
        toleranceAnalysisResult,
        aiAnalysisResult
      );

      // Calculate overall manufacturability score
      const manufacturabilityScore = this.calculateManufacturabilityScore({
        materialScore: materialAnalysisResult.isOptimal ? 90 : 70,
        featureScore: this.calculateFeatureScore(featureAnalysisResult),
        toleranceScore: toleranceAnalysisResult.isRealistic ? 90 : 60,
        qualityScore: mlPredictions.score,
      });

      // Generate AI summary
      const aiInsights = await this.generateAiInsights(
        partData,
        manufacturabilityScore,
        materialAnalysisResult,
        featureAnalysisResult,
        costOptimization
      );

      return {
        manufacturabilityScore,
        costEfficiency: costOptimization.potentialSavings > 15 ? 70 : 85,
        qualityRisk: mlPredictions.riskLevel,
        materialAnalysis: materialAnalysisResult,
        featureAnalysis: featureAnalysisResult,
        toleranceAnalysis: toleranceAnalysisResult,
        processRecommendations: processRecommendationsResult,
        costOptimization,
        aiInsights,
      };
    } catch (error) {
      this.logger.error(`Advanced DFM analysis failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Analyze material selection with AI
   */
  private async analyzeMaterial(partData: any) {
    const currentMaterial = this.getMaterial(partData.material);
    const alternatives: any[] = [];
    const compatibilityIssues: string[] = [];

    if (!currentMaterial) {
      compatibilityIssues.push(`Material "${partData.material}" not found in database`);
      return {
        currentMaterial: partData.material,
        isOptimal: false,
        alternatives: [],
        compatibilityIssues,
      };
    }

    // Check material suitability
    if (partData.application) {
      const appLower = partData.application.toLowerCase();
      if (appLower.includes('food') && !currentMaterial.foodSafe) {
        compatibilityIssues.push('Material is not food-safe');
      }
      if (appLower.includes('medical') && !currentMaterial.biocompatible) {
        compatibilityIssues.push('Material is not biocompatible');
      }
    }

    // Check min wall thickness
    const minThickness = Math.min(
      ...(partData.features.thinWalls?.map((w: any) => w.thickness) || [Infinity])
    );
    if (minThickness < currentMaterial.minWallThickness) {
      compatibilityIssues.push(
        `Min wall thickness (${minThickness}mm) is below recommended (${currentMaterial.minWallThickness}mm)`
      );
    }

    // Get AI recommendations for alternatives
    const allMaterials = this.getAllMaterials();
    const similarMaterials = allMaterials.filter(
      m => m.category === currentMaterial.category && m.name !== currentMaterial.name
    );

    for (const material of similarMaterials.slice(0, 3)) {
      const costImpact = ((material.relativeCost - currentMaterial.relativeCost) / currentMaterial.relativeCost) * 100;
      
      let performanceImpact = 'Similar performance';
      if (material.tensileStrength > currentMaterial.tensileStrength * 1.2) {
        performanceImpact = 'Higher strength';
      } else if (material.tensileStrength < currentMaterial.tensileStrength * 0.8) {
        performanceImpact = 'Lower strength';
      }

      // Calculate suitability score
      let score = 70;
      if (Math.abs(costImpact) < 20) score += 10; // Similar cost
      if (material.machinability > currentMaterial.machinability) score += 10;
      if (material.availability > currentMaterial.availability) score += 5;
      if (costImpact < 0) score += 5; // Cheaper

      const reason = await this.generateMaterialReason(currentMaterial, material, partData);

      alternatives.push({
        material: material.name,
        reason,
        costImpact: Math.round(costImpact),
        performanceImpact,
        score: Math.min(100, score),
      });
    }

    alternatives.sort((a, b) => b.score - a.score);

    const isOptimal = alternatives.length === 0 || alternatives[0].score < 85;

    return {
      currentMaterial: currentMaterial.name,
      isOptimal,
      alternatives: alternatives.slice(0, 3),
      compatibilityIssues,
    };
  }

  /**
   * Generate AI reasoning for material alternative
   */
  private async generateMaterialReason(
    current: MaterialProperties,
    alternative: MaterialProperties,
    partData: any
  ): Promise<string> {
    try {
      const prompt = `Compare ${alternative.name} vs ${current.name} for this application:
- Part: ${partData.name}
- Quantity: ${partData.quantity}
- Process: ${partData.process}
${partData.application ? `- Application: ${partData.application}` : ''}

${alternative.name} has:
- ${alternative.relativeCost < current.relativeCost ? 'Lower' : 'Higher'} cost (${Math.round(((alternative.relativeCost - current.relativeCost) / current.relativeCost) * 100)}%)
- ${alternative.machinability > current.machinability ? 'Better' : 'Worse'} machinability
- ${alternative.tensileStrength > current.tensileStrength ? 'Higher' : 'Lower'} strength

Provide ONE sentence explaining when to consider ${alternative.name}.`;

      const response = await this.ollamaService.ask(prompt, undefined, { temperature: 0.3 });
      return response.split('\n')[0].trim();
    } catch (error) {
      this.logger.warn(`Failed to generate material reason: ${error}`);
      return `Consider for ${alternative.machinability > current.machinability ? 'easier machining' : 'different properties'}`;
    }
  }

  /**
   * Analyze features with AI
   */
  private async analyzeFeatures(partData: any) {
    const result: any = {
      holes: [],
      pockets: [],
      threads: [],
      thinWalls: [],
    };

    // Analyze holes
    if (partData.features.holes) {
      for (const hole of partData.features.holes) {
        const issues: string[] = [];
        const suggestions: string[] = [];
        let toolingCost: 'low' | 'medium' | 'high' = 'low';

        const aspectRatio = hole.depth / hole.diameter;

        if (hole.diameter < 1.0) {
          issues.push('Very small diameter may require micro-machining');
          toolingCost = 'high';
        }

        if (aspectRatio > 5) {
          issues.push(`High aspect ratio (${aspectRatio.toFixed(1)}:1) may cause tool deflection`);
          suggestions.push('Consider using peck drilling or gun drilling');
          toolingCost = 'medium';
        }

        if (hole.diameter < 3 && hole.depth > 15) {
          issues.push('Deep small hole is difficult to machine');
          suggestions.push('Reduce depth or increase diameter if possible');
        }

        result.holes.push({
          id: hole.id,
          diameter: hole.diameter,
          depth: hole.depth,
          issues,
          suggestions,
          toolingCost,
        });
      }
    }

    // Analyze pockets
    if (partData.features.pockets) {
      for (const pocket of partData.features.pockets) {
        const issues: string[] = [];
        const suggestions: string[] = [];
        const aspectRatio = pocket.depth / pocket.width;
        let toolingDifficulty = 50;

        if (aspectRatio > 4) {
          issues.push(`Very deep pocket (aspect ratio ${aspectRatio.toFixed(1)}:1)`);
          suggestions.push('Reduce depth or increase width for better tool access');
          toolingDifficulty = 85;
        } else if (aspectRatio > 2) {
          issues.push('Deep pocket may require long tools');
          toolingDifficulty = 70;
        }

        if (pocket.width < 5) {
          issues.push('Narrow pocket limits tool selection');
          toolingDifficulty += 10;
        }

        result.pockets.push({
          id: pocket.id,
          depth: pocket.depth,
          width: pocket.width,
          aspectRatio,
          issues,
          suggestions,
          toolingDifficulty: Math.min(100, toolingDifficulty),
        });
      }
    }

    // Analyze threads
    if (partData.features.threads) {
      for (const thread of partData.features.threads) {
        const issues: string[] = [];
        const suggestions: string[] = [];

        const sizeMatch = thread.size.match(/M(\d+)/);
        const diameter = sizeMatch ? parseInt(sizeMatch[1]) : 6;

        if (diameter < 3) {
          issues.push('Small thread size is prone to stripping');
          suggestions.push('Consider larger thread size or thread insert');
        }

        if (thread.depth < diameter * 1.5) {
          issues.push('Shallow thread may not provide sufficient engagement');
          suggestions.push(`Increase depth to at least ${(diameter * 1.5).toFixed(1)}mm`);
        }

        if (thread.depth > diameter * 5) {
          issues.push('Very deep thread is difficult to tap');
          suggestions.push('Consider through-hole or shorter thread');
        }

        result.threads.push({
          id: thread.id,
          size: thread.size,
          depth: thread.depth,
          issues,
          suggestions,
        });
      }
    }

    // Analyze thin walls
    if (partData.features.thinWalls) {
      const material = this.getMaterial(partData.material);
      const minRecommended = material?.minWallThickness || 1.5;

      for (const wall of partData.features.thinWalls) {
        const issues: string[] = [];
        const suggestions: string[] = [];
        let risk: 'low' | 'medium' | 'high' = 'low';

        if (wall.thickness < minRecommended) {
          issues.push(`Below recommended minimum (${minRecommended}mm) for ${partData.material}`);
          risk = 'high';
          suggestions.push(`Increase to at least ${minRecommended}mm`);
        } else if (wall.thickness < minRecommended * 1.2) {
          issues.push('Near minimum thickness - may deflect during machining');
          risk = 'medium';
          suggestions.push('Add support ribs or increase thickness');
        }

        result.thinWalls.push({
          location: wall.location,
          thickness: wall.thickness,
          issues,
          suggestions,
          risk,
        });
      }
    }

    return result;
  }

  /**
   * Analyze tolerance requirements
   */
  private async analyzeTolerance(partData: any) {
    const toleranceValue = this.parseToleranceValue(partData.tolerance);
    const material = this.getMaterial(partData.material);
    
    let isRealistic = true;
    const recommendations: string[] = [];
    let costImpact = 'Standard';
    let alternativeTolerance: string | undefined;
    let savings: number | undefined;

    // Check if tolerance is realistic
    if (toleranceValue < 0.01) {
      isRealistic = false;
      recommendations.push('Tolerance tighter than ±0.01mm requires precision grinding');
      costImpact = 'Very High (+100-200%)';
    } else if (toleranceValue < 0.025) {
      recommendations.push('Tight tolerance requires precision machining and quality inspection');
      costImpact = 'High (+50-100%)';
      alternativeTolerance = '±0.05mm';
      savings = 30;
    } else if (toleranceValue < 0.05) {
      recommendations.push('Moderate tolerance achievable with CNC machining');
      costImpact = 'Medium (+20-40%)';
      alternativeTolerance = '±0.1mm';
      savings = 15;
    } else if (toleranceValue < 0.1) {
      costImpact = 'Low (+10-20%)';
    }

    // Material-specific recommendations
    if (material && material.machinability < 60 && toleranceValue < 0.05) {
      recommendations.push(
        `${material.name} is difficult to machine to tight tolerances - consider easier material`
      );
    }

    return {
      current: partData.tolerance,
      isRealistic,
      recommendations,
      costImpact,
      alternativeTolerance,
      savings,
    };
  }

  /**
   * Recommend manufacturing process
   */
  private async recommendProcess(partData: any) {
    const primaryProcess = partData.process || 'CNC Milling';
    const secondaryProcesses: string[] = [];
    const toolingRequirements: string[] = [];
    
    // Calculate complexity factors
    const hasComplexFeatures = 
      (partData.features.holes?.length || 0) > 10 ||
      (partData.features.pockets?.length || 0) > 5 ||
      partData.features.complexity > 0.7;

    const hasTightTolerance = this.parseToleranceValue(partData.tolerance) < 0.05;

    // Estimate times
    let setupTime = 0.5; // Base setup
    let machiningTime = 1.0; // Base machining

    // Adjust for features
    machiningTime += (partData.features.holes?.length || 0) * 0.1;
    machiningTime += (partData.features.pockets?.length || 0) * 0.3;
    machiningTime += (partData.features.threads?.length || 0) * 0.15;
    machiningTime += partData.features.complexity * 2;

    // Adjust for material
    const material = this.getMaterial(partData.material);
    if (material) {
      machiningTime *= (100 - material.machinability) / 100 + 0.5;
    }

    // Tooling requirements
    if ((partData.features.holes?.length || 0) > 0) {
      toolingRequirements.push('Drill bits (various sizes)');
    }
    if ((partData.features.pockets?.length || 0) > 0) {
      toolingRequirements.push('End mills (roughing & finishing)');
    }
    if ((partData.features.threads?.length || 0) > 0) {
      toolingRequirements.push('Taps or thread mills');
    }
    if (hasTightTolerance) {
      toolingRequirements.push('Precision measurement tools');
    }

    // Secondary processes
    if (partData.finish && partData.finish !== 'as machined') {
      secondaryProcesses.push(partData.finish);
    }
    if (hasTightTolerance) {
      secondaryProcesses.push('Quality inspection (CMM)');
    }

    // Fixture complexity
    let fixtureComplexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (hasComplexFeatures || partData.features.thinWalls?.length > 0) {
      fixtureComplexity = 'moderate';
    }
    if (hasTightTolerance && partData.features.thinWalls?.length > 0) {
      fixtureComplexity = 'complex';
    }

    return {
      primaryProcess,
      secondaryProcesses,
      toolingRequirements,
      estimatedSetupTime: Math.round(setupTime * 10) / 10,
      estimatedMachiningTime: Math.round(machiningTime * 10) / 10,
      fixtureComplexity,
    };
  }

  /**
   * Analyze cost optimization opportunities
   */
  private async analyzeCostOptimization(
    partData: any,
    materialAnalysis: any,
    toleranceAnalysis: any,
    aiAnalysis: any
  ) {
    const recommendations: any[] = [];
    let currentEstimate = 100; // Base estimate
    let totalSavings = 0;

    // Material optimization
    if (materialAnalysis.alternatives.length > 0 && materialAnalysis.alternatives[0].costImpact < -10) {
      const alt = materialAnalysis.alternatives[0];
      recommendations.push({
        category: 'material',
        suggestion: `Switch to ${alt.material}: ${alt.reason}`,
        impact: Math.abs(alt.costImpact),
        effort: 'low',
      });
      totalSavings += Math.abs(alt.costImpact);
    }

    // Tolerance optimization
    if (toleranceAnalysis.savings && toleranceAnalysis.savings > 10) {
      recommendations.push({
        category: 'tolerance',
        suggestion: `Relax tolerance to ${toleranceAnalysis.alternativeTolerance} where possible`,
        impact: toleranceAnalysis.savings,
        effort: 'low',
      });
      totalSavings += toleranceAnalysis.savings;
    }

    // Finish optimization
    if (partData.finish !== 'as machined' && partData.finish !== 'As machined') {
      recommendations.push({
        category: 'finish',
        suggestion: 'Use as-machined finish to eliminate secondary operations',
        impact: 15,
        effort: 'low',
      });
    }

    // Quantity optimization
    if (partData.quantity < 10) {
      recommendations.push({
        category: 'quantity',
        suggestion: 'Increase quantity to 10+ units for volume discount (20-30% per unit)',
        impact: 25,
        effort: 'medium',
      });
    }

    // Design simplification
    if (partData.features.complexity > 0.6) {
      recommendations.push({
        category: 'design',
        suggestion: 'Simplify design: reduce pockets, combine features, eliminate tight tolerances',
        impact: 20,
        effort: 'high',
      });
    }

    // Sort by impact
    recommendations.sort((a, b) => b.impact - a.impact);

    const potentialSavings = Math.min(totalSavings, 40); // Cap at 40%
    const optimizedEstimate = currentEstimate * (1 - potentialSavings / 100);

    return {
      currentEstimate,
      optimizedEstimate,
      potentialSavings,
      recommendations: recommendations.slice(0, 5),
    };
  }

  /**
   * Generate AI insights summary
   */
  private async generateAiInsights(
    partData: any,
    manufacturabilityScore: number,
    materialAnalysis: any,
    featureAnalysis: any,
    costOptimization: any
  ) {
    // Collect critical issues
    const criticalIssues: string[] = [];
    featureAnalysis.holes?.forEach((h: any) => {
      if (h.toolingCost === 'high') criticalIssues.push(`Hole ${h.id}: ${h.issues[0]}`);
    });
    featureAnalysis.pockets?.forEach((p: any) => {
      if (p.toolingDifficulty > 80) criticalIssues.push(`Pocket ${p.id}: ${p.issues[0]}`);
    });
    featureAnalysis.thinWalls?.forEach((w: any) => {
      if (w.risk === 'high') criticalIssues.push(`Thin wall at ${w.location}: ${w.issues[0]}`);
    });

    // Quick wins
    const quickWins: string[] = [];
    costOptimization.recommendations
      .filter((r: any) => r.effort === 'low' && r.impact > 10)
      .forEach((r: any) => quickWins.push(r.suggestion));

    // Long-term suggestions
    const longTermSuggestions: string[] = [];
    costOptimization.recommendations
      .filter((r: any) => r.effort === 'high')
      .forEach((r: any) => longTermSuggestions.push(r.suggestion));

    // Generate AI summary
    const prompt = `Summarize this DFM analysis in 2-3 sentences:
- Manufacturability score: ${manufacturabilityScore}/100
- Material: ${partData.material} ${materialAnalysis.isOptimal ? '(optimal)' : '(consider alternatives)'}
- Critical issues: ${criticalIssues.length}
- Potential savings: ${costOptimization.potentialSavings}%

Focus on the most important finding and key recommendation.`;

    const summary = await this.ollamaService.ask(prompt, undefined, { temperature: 0.4 });

    return {
      summary: summary.split('\n')[0],
      criticalIssues: criticalIssues.slice(0, 5),
      quickWins: quickWins.slice(0, 3),
      longTermSuggestions: longTermSuggestions.slice(0, 3),
    };
  }

  /**
   * Helper: Calculate manufacturability score
   */
  private calculateManufacturabilityScore(scores: {
    materialScore: number;
    featureScore: number;
    toleranceScore: number;
    qualityScore: number;
  }): number {
    const weights = {
      material: 0.25,
      feature: 0.30,
      tolerance: 0.20,
      quality: 0.25,
    };

    return Math.round(
      scores.materialScore * weights.material +
      scores.featureScore * weights.feature +
      scores.toleranceScore * weights.tolerance +
      scores.qualityScore * weights.quality
    );
  }

  /**
   * Helper: Calculate feature score
   */
  private calculateFeatureScore(featureAnalysis: any): number {
    let score = 100;
    
    // Deduct for hole issues
    featureAnalysis.holes?.forEach((h: any) => {
      if (h.toolingCost === 'high') score -= 10;
      else if (h.toolingCost === 'medium') score -= 5;
    });

    // Deduct for pocket issues
    featureAnalysis.pockets?.forEach((p: any) => {
      score -= (p.toolingDifficulty - 50) / 10;
    });

    // Deduct for thin wall risks
    featureAnalysis.thinWalls?.forEach((w: any) => {
      if (w.risk === 'high') score -= 15;
      else if (w.risk === 'medium') score -= 8;
    });

    return Math.max(0, Math.round(score));
  }

  /**
   * Helper: Parse tolerance value
   */
  private parseToleranceValue(tolerance: string): number {
    const match = tolerance.match(/[±]?\s*([\d.]+)/);
    return match ? parseFloat(match[1]) : 0.1;
  }
}
