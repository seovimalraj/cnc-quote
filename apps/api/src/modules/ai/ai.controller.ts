import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { AIOrchestrator } from './ai-orchestrator.service';
import { OllamaService } from './ollama.service';
import { EmbeddingsService } from './embeddings.service';
import { MLPredictionsService } from './ml-predictions.service';

@Controller('ai')
export class AIController {
  private readonly logger = new Logger(AIController.name);

  constructor(
    private aiOrchestrator: AIOrchestrator,
    private ollamaService: OllamaService,
    private embeddingsService: EmbeddingsService,
    private mlPredictionsService: MLPredictionsService
  ) {}

  /**
   * Health check endpoint
   */
  @Get('health')
  async health() {
    const isHealthy = await this.ollamaService.healthCheck();
    const models = await this.ollamaService.listModels();

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      ollama: {
        available: isHealthy,
        models: models,
      },
      cache: this.embeddingsService.getCacheStats(),
    };
  }

  /**
   * Comprehensive part analysis
   */
  @Post('analyze-part')
  @HttpCode(HttpStatus.OK)
  async analyzePart(
    @Body()
    body: {
      part: {
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
      };
      historicalQuotes?: Array<{
        id: string;
        material: string;
        process: string;
        dimensions: { x: number; y: number; z: number };
        features: string[];
        volume?: number;
        price: number;
        leadTime: number;
      }>;
    }
  ) {
    this.logger.log(`Analyzing part: ${body.part.name}`);

    try {
      const analysis = await this.aiOrchestrator.analyzePartComplete(
        body.part,
        body.historicalQuotes
      );

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      this.logger.error(`Part analysis failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * AI Chat endpoint
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body()
    body: {
      message: string;
      context?: {
        partName?: string;
        material?: string;
        process?: string;
        currentQuote?: any;
      };
    }
  ) {
    this.logger.log(`Chat request: ${body.message.substring(0, 50)}...`);

    try {
      const response = await this.aiOrchestrator.chat(body.message, body.context);

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      this.logger.error(`Chat failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Compare materials
   */
  @Post('compare-materials')
  @HttpCode(HttpStatus.OK)
  async compareMaterials(
    @Body()
    body: {
      materials: string[];
      application: string;
      requirements?: {
        strength?: boolean;
        corrosion?: boolean;
        weight?: boolean;
        cost?: boolean;
      };
    }
  ) {
    this.logger.log(`Comparing materials: ${body.materials.join(', ')}`);

    try {
      const comparison = await this.aiOrchestrator.compareMaterials(
        body.materials,
        body.application,
        body.requirements
      );

      return {
        success: true,
        data: comparison,
      };
    } catch (error) {
      this.logger.error(`Material comparison failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate cost optimization suggestions
   */
  @Post('optimize-cost')
  @HttpCode(HttpStatus.OK)
  async optimizeCost(
    @Body()
    body: {
      material: string;
      dimensions: { x: number; y: number; z: number };
      features: string[];
      tolerance?: string;
      finish?: string;
      quantity: number;
    }
  ) {
    this.logger.log(`Generating cost optimizations for ${body.material} part`);

    try {
      const suggestions = await this.ollamaService.suggestOptimizations(body);

      return {
        success: true,
        data: {
          suggestions,
          estimatedSavings: '15-30%',
        },
      };
    } catch (error) {
      this.logger.error(`Cost optimization failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Predict lead time
   */
  @Post('predict-leadtime')
  @HttpCode(HttpStatus.OK)
  async predictLeadTime(
    @Body()
    body: {
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
  ) {
    this.logger.log(`Predicting lead time for ${body.material} part`);

    try {
      const prediction = await this.mlPredictionsService.predictLeadTime(body);

      return {
        success: true,
        data: prediction,
      };
    } catch (error) {
      this.logger.error(`Lead time prediction failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Predict quality score
   */
  @Post('predict-quality')
  @HttpCode(HttpStatus.OK)
  async predictQuality(
    @Body()
    body: {
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
  ) {
    this.logger.log(`Predicting quality for ${body.material} part`);

    try {
      const prediction = await this.mlPredictionsService.predictQuality(body);

      return {
        success: true,
        data: prediction,
      };
    } catch (error) {
      this.logger.error(`Quality prediction failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Analyze manufacturability
   */
  @Post('analyze-manufacturability')
  @HttpCode(HttpStatus.OK)
  async analyzeManufacturability(
    @Body()
    body: {
      features: {
        thinWalls?: { thickness: number; locations: number };
        deepPockets?: { depth: number; width: number; count: number };
        tightTolerances?: { tolerance: string; count: number };
        threads?: { type: string; depth: number; count: number };
      };
    }
  ) {
    this.logger.log('Analyzing manufacturability');

    try {
      const analysis = await this.aiOrchestrator.analyzeManufacturability(body.features);

      return {
        success: true,
        data: analysis,
      };
    } catch (error) {
      this.logger.error(`Manufacturability analysis failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Semantic search for quotes
   */
  @Post('search-quotes')
  @HttpCode(HttpStatus.OK)
  async searchQuotes(
    @Body()
    body: {
      query: string;
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
      }>;
      limit?: number;
    }
  ) {
    this.logger.log(`Searching quotes: "${body.query}"`);

    try {
      const results = await this.aiOrchestrator.searchQuotes(
        body.query,
        body.quotes,
        body.limit || 10
      );

      return {
        success: true,
        data: {
          results,
          count: results.length,
        },
      };
    } catch (error) {
      this.logger.error(`Quote search failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate embeddings
   */
  @Post('embeddings')
  @HttpCode(HttpStatus.OK)
  async generateEmbeddings(
    @Body()
    body: {
      texts: string[];
    }
  ) {
    this.logger.log(`Generating embeddings for ${body.texts.length} texts`);

    try {
      const embeddings = await this.embeddingsService.generateEmbeddingsBatch(body.texts);

      return {
        success: true,
        data: {
          embeddings,
          dimensions: embeddings[0]?.dimensions || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Embedding generation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Calculate similarity
   */
  @Post('similarity')
  @HttpCode(HttpStatus.OK)
  async calculateSimilarity(
    @Body()
    body: {
      text1: string;
      text2: string;
    }
  ) {
    this.logger.log('Calculating text similarity');

    try {
      const [emb1, emb2] = await Promise.all([
        this.embeddingsService.generateEmbedding(body.text1),
        this.embeddingsService.generateEmbedding(body.text2),
      ]);

      const similarity = this.embeddingsService.cosineSimilarity(
        emb1.embedding,
        emb2.embedding
      );

      return {
        success: true,
        data: {
          similarity,
          percentage: Math.round(similarity * 100),
        },
      };
    } catch (error) {
      this.logger.error(`Similarity calculation failed: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Clear embeddings cache
   */
  @Post('cache/clear')
  @HttpCode(HttpStatus.OK)
  async clearCache() {
    this.embeddingsService.clearCache();

    return {
      success: true,
      message: 'Cache cleared',
    };
  }
}
