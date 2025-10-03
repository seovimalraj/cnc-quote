import { Injectable, Logger } from '@nestjs/common';
import { OllamaService } from './ollama.service';
import { EmbeddingsService, SimilarityMatch } from './embeddings.service';
import {
  MLPredictionsService,
  LeadTimePrediction,
  QualityPrediction,
  PricePrediction,
} from './ml-predictions.service';

export interface AIRecommendation {
  type: 'cost' | 'quality' | 'leadtime' | 'material' | 'design';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: {
    cost?: number; // Percentage change
    time?: number; // Days change
    quality?: number; // Quality score change
  };
  action: string;
}

export interface ComprehensiveAnalysis {
  summary: string;
  leadTime: LeadTimePrediction;
  quality: QualityPrediction;
  price: PricePrediction;
  recommendations: AIRecommendation[];
  similarQuotes: SimilarityMatch[];
  manufacturabilityScore: number;
}

@Injectable()
export class AIOrchestrator {
  private readonly logger = new Logger(AIOrchestrator.name);

  constructor(
    private ollamaService: OllamaService,
    private embeddingsService: EmbeddingsService,
    private mlPredictionsService: MLPredictionsService
  ) {}

  /**
   * Comprehensive AI analysis of a part
   */
  async analyzePartComplete(
    partData: {
      name: string;
      material: string;
      dimensions: { x: number; y: number; z: number };
      volume: number;
      surfaceArea: number;
      features: {
        holes: number;
        pockets: number;
        threads: number;
        thinWalls?: { thickness: number; locations: number };
        deepPockets?: { depth: number; width: number; count: number };
        tightTolerances?: { tolerance: string; count: number };
        complexity: number;
      };
      tolerance: string;
      finish: string;
      quantity: number;
      process: string;
    },
    historicalQuotes?: Array<{
      id: string;
      material: string;
      process: string;
      dimensions: { x: number; y: number; z: number };
      features: string[];
      volume?: number;
      price: number;
      leadTime: number;
    }>
  ): Promise<ComprehensiveAnalysis> {
    this.logger.log(`Starting comprehensive analysis for part: ${partData.name}`);

    try {
      // Run all analyses in parallel for speed
      const [leadTime, quality, price, similarQuotes, aiRecommendations] = await Promise.all([
        // ML Predictions
        this.mlPredictionsService.predictLeadTime(partData),
        this.mlPredictionsService.predictQuality(partData),
        this.mlPredictionsService.predictPrice(partData, historicalQuotes),

        // Semantic search for similar quotes
        historicalQuotes
          ? this.embeddingsService.findSimilarQuotes(
              {
                material: partData.material,
                process: partData.process,
                dimensions: partData.dimensions,
                features: this.extractFeatureList(partData.features),
                volume: partData.volume,
              },
              historicalQuotes,
              5
            )
          : Promise.resolve([]),

        // AI-generated cost optimization suggestions
        this.ollamaService.suggestOptimizations({
          material: partData.material,
          dimensions: partData.dimensions,
          features: this.extractFeatureList(partData.features),
          tolerance: partData.tolerance,
          finish: partData.finish,
          quantity: partData.quantity,
        }),
      ]);

      // Generate AI summary
      const summary = await this.generateSummary(partData, {
        leadTime,
        quality,
        price,
      });

      // Convert AI suggestions to structured recommendations
      const recommendations = this.structureRecommendations(
        aiRecommendations,
        quality,
        leadTime,
        price
      );

      // Calculate overall manufacturability score
      const manufacturabilityScore = this.calculateManufacturabilityScore({
        quality,
        complexity: partData.features.complexity,
        features: partData.features,
      });

      this.logger.log(
        `Analysis complete: ${recommendations.length} recommendations, ` +
        `manufacturability score: ${manufacturabilityScore}/100`
      );

      return {
        summary,
        leadTime,
        quality,
        price,
        recommendations,
        similarQuotes,
        manufacturabilityScore,
      };
    } catch (error) {
      this.logger.error(`Analysis failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Quick AI chat for manufacturing questions
   */
  async chat(
    message: string,
    context?: {
      partName?: string;
      material?: string;
      process?: string;
      currentQuote?: any;
    }
  ): Promise<{ response: string; suggestions?: string[] }> {
    const contextualInfo = context
      ? {
          material: context.material,
          process: context.process,
          features: context.currentQuote?.features || [],
        }
      : undefined;

    const response = await this.ollamaService.manufacturingChat(message, contextualInfo);

    return {
      response,
      suggestions: await this.extractActionItems(response),
    };
  }

  /**
   * Compare materials with AI reasoning
   */
  async compareMaterials(
    materials: string[],
    application: string,
    requirements?: {
      strength?: boolean;
      corrosion?: boolean;
      weight?: boolean;
      cost?: boolean;
    }
  ): Promise<{
    recommendation: string;
    reasoning: string;
    comparison: Array<{
      material: string;
      pros: string[];
      cons: string[];
      score: number;
    }>;
  }> {
    // Get AI recommendation
    const aiResult = await this.ollamaService.compareMaterials(materials, application);

    // Get detailed comparison for each material
    const comparisonPromises = materials.map(async material => {
      const prompt = `List 2-3 pros and 2-3 cons of ${material} for ${application}. Be concise.
Format:
PROS:
- [pro 1]
- [pro 2]
CONS:
- [con 1]
- [con 2]`;

      const response = await this.ollamaService.ask(prompt, undefined, { temperature: 0.3 });

      const prosSection = response.match(/PROS:([\s\S]*?)(?=CONS:|$)/i)?.[1] || '';
      const consSection = response.match(/CONS:([\s\S]*?)$/i)?.[1] || '';

      const pros = this.extractBulletPoints(prosSection);
      const cons = this.extractBulletPoints(consSection);

      // Calculate score based on requirements
      let score = 50; // Base score
      if (requirements) {
        // Simple scoring logic
        if (requirements.strength && material.toLowerCase().includes('steel')) score += 15;
        if (requirements.corrosion && material.toLowerCase().includes('stainless')) score += 15;
        if (requirements.weight && material.toLowerCase().includes('aluminum')) score += 15;
        if (requirements.cost && material.toLowerCase().includes('aluminum')) score += 10;
      }

      return { material, pros, cons, score: Math.min(100, score) };
    });

    const comparison = await Promise.all(comparisonPromises);

    return {
      recommendation: aiResult.recommendation,
      reasoning: aiResult.reasoning,
      comparison: comparison.sort((a, b) => b.score - a.score),
    };
  }

  /**
   * Analyze manufacturability issues with AI
   */
  async analyzeManufacturability(
    features: {
      thinWalls?: { thickness: number; locations: number };
      deepPockets?: { depth: number; width: number; count: number };
      tightTolerances?: { tolerance: string; count: number };
      threads?: { type: string; depth: number; count: number };
    }
  ): Promise<{
    issues: Array<{ severity: 'high' | 'medium' | 'low'; description: string }>;
    suggestions: Array<{ improvement: string; benefit: string }>;
    overallScore: number;
  }> {
    const aiResult = await this.ollamaService.analyzeManufacturability(features);

    // Classify issues by severity
    const issues = aiResult.issues.map(issue => {
      let severity: 'high' | 'medium' | 'low' = 'low';

      if (
        issue.toLowerCase().includes('very') ||
        issue.toLowerCase().includes('critical') ||
        issue.toLowerCase().includes('impossible')
      ) {
        severity = 'high';
      } else if (
        issue.toLowerCase().includes('difficult') ||
        issue.toLowerCase().includes('expensive') ||
        issue.toLowerCase().includes('risk')
      ) {
        severity = 'medium';
      }

      return { severity, description: issue };
    });

    // Structure suggestions with benefits
    const suggestions = aiResult.suggestions.map(suggestion => {
      // Try to extract benefit if mentioned
      const parts = suggestion.split(/to reduce|to improve|to increase|will|benefits/i);
      return {
        improvement: parts[0].trim(),
        benefit: parts[1]?.trim() || 'Improves manufacturability',
      };
    });

    // Calculate overall score
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const mediumIssues = issues.filter(i => i.severity === 'medium').length;
    const lowIssues = issues.filter(i => i.severity === 'low').length;

    const overallScore = Math.max(
      0,
      100 - highIssues * 25 - mediumIssues * 10 - lowIssues * 5
    );

    return {
      issues,
      suggestions,
      overallScore,
    };
  }

  /**
   * Search historical quotes semantically
   */
  async searchQuotes(
    query: string,
    quotes: Array<{
      id: string;
      partName: string;
      material: string;
      process: string;
      features?: string[];
      description?: string;
      price: number;
      leadTime: number;
      createdAt: string;
    }>,
    limit: number = 10
  ): Promise<
    Array<
      SimilarityMatch & {
        price: number;
        leadTime: number;
        createdAt: string;
      }
    >
  > {
    const results = await this.embeddingsService.searchQuotes(query, quotes, limit);

    return results.map(result => {
      const quote = quotes.find(q => q.id === result.id);
      return {
        ...result,
        price: quote?.price || 0,
        leadTime: quote?.leadTime || 0,
        createdAt: quote?.createdAt || '',
      };
    });
  }

  /**
   * Generate executive summary
   */
  private async generateSummary(
    partData: any,
    analysis: {
      leadTime: LeadTimePrediction;
      quality: QualityPrediction;
      price: PricePrediction;
    }
  ): Promise<string> {
    const prompt = `Create a 2-3 sentence executive summary for this CNC part:

Part: ${partData.name}
Material: ${partData.material}
Quantity: ${partData.quantity}
Estimated Price: $${analysis.price.estimatedPrice.toFixed(2)}
Lead Time: ${analysis.leadTime.estimatedDays} days
Quality Score: ${analysis.quality.score}/100 (${analysis.quality.riskLevel} risk)

Focus on key findings and any important concerns.`;

    return this.ollamaService.ask(prompt, undefined, { temperature: 0.4 });
  }

  /**
   * Structure AI recommendations
   */
  private structureRecommendations(
    aiSuggestions: string[],
    quality: QualityPrediction,
    leadTime: LeadTimePrediction,
    price: PricePrediction
  ): AIRecommendation[] {
    const recommendations: AIRecommendation[] = [];

    // Add AI suggestions as cost recommendations
    aiSuggestions.forEach(suggestion => {
      recommendations.push({
        type: 'cost',
        priority: this.determinePriority(suggestion),
        title: 'Cost Optimization',
        description: suggestion,
        impact: { cost: -15 }, // Assume 15% cost reduction
        action: 'Consider this modification',
      });
    });

    // Add quality-based recommendations
    quality.recommendations.forEach(rec => {
      recommendations.push({
        type: 'quality',
        priority: quality.riskLevel === 'high' ? 'high' : 'medium',
        title: 'Quality Improvement',
        description: rec,
        impact: { quality: 10 },
        action: 'Implement this change',
      });
    });

    // Add lead time recommendation if high
    if (leadTime.estimatedDays > 10) {
      recommendations.push({
        type: 'leadtime',
        priority: 'medium',
        title: 'Reduce Lead Time',
        description: 'Consider simplifying design or using readily available materials',
        impact: { time: -3 },
        action: 'Review design complexity',
      });
    }

    return recommendations.slice(0, 8); // Top 8 recommendations
  }

  /**
   * Calculate manufacturability score
   */
  private calculateManufacturabilityScore(data: {
    quality: QualityPrediction;
    complexity: number;
    features: any;
  }): number {
    let score = data.quality.score;

    // Penalize high complexity
    score -= data.complexity * 20;

    // Penalize difficult features
    if (data.features.thinWalls?.thickness < 1.5) score -= 10;
    if (data.features.deepPockets) score -= 5;
    if (data.features.tightTolerances) score -= 10;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Extract feature list from features object
   */
  private extractFeatureList(features: any): string[] {
    const list: string[] = [];

    if (features.holes > 0) list.push(`${features.holes} holes`);
    if (features.pockets > 0) list.push(`${features.pockets} pockets`);
    if (features.threads > 0) list.push(`${features.threads} threads`);
    if (features.thinWalls) list.push(`thin walls (${features.thinWalls.thickness}mm)`);
    if (features.deepPockets) list.push(`deep pockets`);
    if (features.tightTolerances) list.push(`tight tolerances`);

    return list;
  }

  /**
   * Extract bullet points from text
   */
  private extractBulletPoints(text: string): string[] {
    return text
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(s => s.length > 0);
  }

  /**
   * Extract action items from AI response
   */
  private async extractActionItems(text: string): Promise<string[]> {
    // Simple extraction of action-oriented sentences
    const sentences = text.split(/[.!?]+/).map(s => s.trim());

    return sentences
      .filter(
        s =>
          s.toLowerCase().includes('should') ||
          s.toLowerCase().includes('consider') ||
          s.toLowerCase().includes('try') ||
          s.toLowerCase().includes('use') ||
          s.toLowerCase().includes('increase') ||
          s.toLowerCase().includes('reduce')
      )
      .slice(0, 3);
  }

  /**
   * Determine recommendation priority
   */
  private determinePriority(suggestion: string): 'high' | 'medium' | 'low' {
    const lower = suggestion.toLowerCase();

    if (
      lower.includes('significantly') ||
      lower.includes('major') ||
      lower.includes('substantial') ||
      lower.includes('critical')
    ) {
      return 'high';
    }

    if (
      lower.includes('consider') ||
      lower.includes('improve') ||
      lower.includes('optimize')
    ) {
      return 'medium';
    }

    return 'low';
  }
}
