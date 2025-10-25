import { Injectable, Logger } from '@nestjs/common';
import { OllamaService } from './ollama.service';

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  dimensions: number;
}

export interface SimilarityMatch {
  id: string;
  text: string;
  similarity: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private embeddingsCache = new Map<string, number[]>();
  private readonly cacheTTL = 3600000; // 1 hour

  constructor(private ollamaService: OllamaService) {}

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    // Check cache
    const cacheKey = this.getCacheKey(text);
    const cached = this.embeddingsCache.get(cacheKey);
    
    if (cached) {
      this.logger.debug(`Cache hit for: ${text.substring(0, 50)}...`);
      return {
        text,
        embedding: cached,
        dimensions: cached.length,
      };
    }

    // Generate new embedding
    const embedding = await this.ollamaService.embed(text);
    
    // Cache result
    this.embeddingsCache.set(cacheKey, embedding);
    setTimeout(() => this.embeddingsCache.delete(cacheKey), this.cacheTTL);

    return {
      text,
      embedding,
      dimensions: embedding.length,
    };
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results = await Promise.all(
      texts.map(text => this.generateEmbedding(text))
    );
    
    this.logger.log(`Generated ${results.length} embeddings`);
    return results;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Find most similar items from a list
   */
  async findSimilar(
    queryText: string,
    items: Array<{ id: string; text: string; metadata?: Record<string, any> }>,
    topK: number = 5,
    threshold: number = 0.7
  ): Promise<SimilarityMatch[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(queryText);

    // Generate embeddings for all items
    const itemEmbeddings = await this.generateEmbeddingsBatch(
      items.map(item => item.text)
    );

    // Calculate similarities
    const similarities: SimilarityMatch[] = items.map((item, index) => ({
      id: item.id,
      text: item.text,
      similarity: this.cosineSimilarity(
        queryEmbedding.embedding,
        itemEmbeddings[index].embedding
      ),
      metadata: item.metadata,
    }));

    // Filter and sort
    return similarities
      .filter(match => match.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Semantic search for quotes
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
    }>,
    topK: number = 10
  ): Promise<SimilarityMatch[]> {
    // Create searchable text for each quote
    const searchableQuotes = quotes.map(quote => ({
      id: quote.id,
      text: this.createQuoteSearchText(quote),
      metadata: {
        partName: quote.partName,
        material: quote.material,
        process: quote.process,
      },
    }));

    return this.findSimilar(query, searchableQuotes, topK, 0.6);
  }

  /**
   * Find similar historical quotes based on part features
   */
  async findSimilarQuotes(
    currentPart: {
      material: string;
      process: string;
      dimensions: { x: number; y: number; z: number };
      features: string[];
      volume?: number;
    },
    historicalQuotes: Array<{
      id: string;
      material: string;
      process: string;
      dimensions: { x: number; y: number; z: number };
      features: string[];
      volume?: number;
      price: number;
      leadTime: number;
    }>,
    topK: number = 5
  ): Promise<Array<SimilarityMatch & { price: number; leadTime: number }>> {
    // Create feature description for current part
    const currentDescription = this.createPartDescription(currentPart);

    // Create descriptions for historical parts
    const historicalItems = historicalQuotes.map(quote => ({
      id: quote.id,
      text: this.createPartDescription(quote),
      metadata: {
        price: quote.price,
        leadTime: quote.leadTime,
        material: quote.material,
      },
    }));

    const matches = await this.findSimilar(currentDescription, historicalItems, topK, 0.7);

    return matches.map(match => ({
      ...match,
      price: match.metadata.price,
      leadTime: match.metadata.leadTime,
    }));
  }

  /**
   * Cluster quotes by similarity
   */
  async clusterQuotes(
    quotes: Array<{
      id: string;
      text: string;
    }>,
    numClusters: number = 5
  ): Promise<Array<{ centroid: string; members: string[] }>> {
    // Generate embeddings for all quotes
    const embeddings = await this.generateEmbeddingsBatch(quotes.map(q => q.text));

    // Simple k-means clustering
    // Initialize centroids randomly
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();
    
    for (let i = 0; i < numClusters; i++) {
      let randomIndex: number;
      do {
        randomIndex = Math.floor(Math.random() * embeddings.length);
      } while (usedIndices.has(randomIndex));
      
      usedIndices.add(randomIndex);
      centroids.push([...embeddings[randomIndex].embedding]);
    }

    // Assign quotes to clusters
    const clusters: Array<{ centroid: string; members: string[] }> = [];
    const assignments = new Array(embeddings.length).fill(0);

    // Run k-means iterations (simplified, 5 iterations)
    for (let iter = 0; iter < 5; iter++) {
      // Assign to nearest centroid
      embeddings.forEach((emb, idx) => {
        let minDist = Infinity;
        let bestCluster = 0;

        centroids.forEach((centroid, clusterIdx) => {
          const similarity = this.cosineSimilarity(emb.embedding, centroid);
          const distance = 1 - similarity; // Convert to distance
          
          if (distance < minDist) {
            minDist = distance;
            bestCluster = clusterIdx;
          }
        });

        assignments[idx] = bestCluster;
      });

      // Update centroids
      for (let c = 0; c < numClusters; c++) {
        const clusterMembers = embeddings.filter((_, idx) => assignments[idx] === c);
        
        if (clusterMembers.length > 0) {
          // Average of all vectors in cluster
          const dim = clusterMembers[0].embedding.length;
          const newCentroid = new Array(dim).fill(0);
          
          clusterMembers.forEach(member => {
            member.embedding.forEach((val, i) => {
              newCentroid[i] += val / clusterMembers.length;
            });
          });
          
          centroids[c] = newCentroid;
        }
      }
    }

    // Build result
    for (let c = 0; c < numClusters; c++) {
      const memberIds = quotes
        .filter((_, idx) => assignments[idx] === c)
        .map(q => q.id);

      if (memberIds.length > 0) {
        clusters.push({
          centroid: `Cluster ${c + 1}`,
          members: memberIds,
        });
      }
    }

    this.logger.log(`Created ${clusters.length} clusters from ${quotes.length} quotes`);
    return clusters;
  }

  /**
   * Helper: Create searchable text from quote
   */
  private createQuoteSearchText(quote: {
    partName: string;
    material: string;
    process: string;
    features?: string[];
    description?: string;
  }): string {
    const parts = [
      quote.partName,
      quote.material,
      quote.process,
      ...(quote.features || []),
      quote.description || '',
    ];

    return parts.filter(p => p).join(' ');
  }

  /**
   * Helper: Create part description for embedding
   */
  private createPartDescription(part: {
    material: string;
    process: string;
    dimensions: { x: number; y: number; z: number };
    features: string[];
    volume?: number;
  }): string {
    const dims = `${part.dimensions.x}x${part.dimensions.y}x${part.dimensions.z}mm`;
    const vol = part.volume ? ` ${part.volume}mm³` : '';
    const features = part.features.join(', ');

    return `${part.process} part in ${part.material}, dimensions ${dims}${vol}, features: ${features}`;
  }

  /**
   * Helper: Generate cache key
   */
  private getCacheKey(text: string): string {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.embeddingsCache.clear();
    this.logger.log('Embeddings cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; maxAge: number } {
    return {
      size: this.embeddingsCache.size,
      maxAge: this.cacheTTL,
    };
  }
}
