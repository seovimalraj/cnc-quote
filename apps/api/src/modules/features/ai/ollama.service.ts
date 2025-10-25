import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
}

export interface OllamaChatResponse {
  model: string;
  message: OllamaMessage;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

export interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

@Injectable()
export class OllamaService {
  private readonly logger = new Logger(OllamaService.name);
  private readonly ollamaHost: string;
  private readonly defaultModel: string;
  private readonly embeddingModel: string;
  private readonly timeout: number = 60000; // 60 seconds

  constructor(private configService: ConfigService) {
    this.ollamaHost = this.configService.get<string>('OLLAMA_HOST', 'http://localhost:11434');
    this.defaultModel = this.configService.get<string>('OLLAMA_DEFAULT_MODEL', 'llama3.1:8b');
    this.embeddingModel = this.configService.get<string>('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text');
    
    this.logger.log(`Ollama service initialized: ${this.ollamaHost}`);
  }

  /**
   * Send a chat completion request to Ollama
   */
  async chat(
    messages: OllamaMessage[],
    options: {
      model?: string;
      temperature?: number;
      stream?: boolean;
    } = {}
  ): Promise<OllamaChatResponse> {
    const model = options.model || this.defaultModel;
    
    try {
      const response = await fetch(`${this.ollamaHost}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: options.stream ?? false,
          options: {
            temperature: options.temperature ?? 0.7,
          },
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as OllamaChatResponse;
      
      this.logger.debug(`Chat completion: ${data.eval_count} tokens in ${data.total_duration}ns`);
      
      return data;
    } catch (error) {
      this.logger.error(`Ollama chat error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   */
  async embed(text: string, model?: string): Promise<number[]> {
    const embeddingModel = model || this.embeddingModel;
    
    try {
      const response = await fetch(`${this.ollamaHost}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: embeddingModel,
          prompt: text,
        }),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as OllamaEmbeddingResponse;
      
      this.logger.debug(`Generated embedding: ${data.embedding.length} dimensions`);
      
      return data.embedding;
    } catch (error) {
      this.logger.error(`Ollama embedding error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Ask a simple question and get a text response
   */
  async ask(
    question: string,
    systemPrompt?: string,
    options: { model?: string; temperature?: number } = {}
  ): Promise<string> {
    const messages: OllamaMessage[] = [];
    
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    
    messages.push({ role: 'user', content: question });

    const response = await this.chat(messages, options);
    return response.message.content;
  }

  /**
   * Manufacturing-specific chat with context
   */
  async manufacturingChat(
    question: string,
    context?: {
      material?: string;
      process?: string;
      features?: string[];
      complexity?: string;
    }
  ): Promise<string> {
    let systemPrompt = `You are an expert CNC manufacturing assistant. You provide accurate, 
concise advice about CNC machining, materials, tolerances, finishes, and design for manufacturability (DFM).
Always provide specific, actionable recommendations.`;

    if (context) {
      systemPrompt += `\n\nCurrent context:`;
      if (context.material) systemPrompt += `\n- Material: ${context.material}`;
      if (context.process) systemPrompt += `\n- Process: ${context.process}`;
      if (context.features?.length) systemPrompt += `\n- Features: ${context.features.join(', ')}`;
      if (context.complexity) systemPrompt += `\n- Complexity: ${context.complexity}`;
    }

    return this.ask(question, systemPrompt, { temperature: 0.3 });
  }

  /**
   * Generate cost optimization suggestions
   */
  async suggestOptimizations(
    partData: {
      material: string;
      dimensions: { x: number; y: number; z: number };
      features: string[];
      tolerance?: string;
      finish?: string;
      quantity: number;
    }
  ): Promise<string[]> {
    const prompt = `Analyze this CNC part and suggest 3-5 specific cost optimization strategies:

Material: ${partData.material}
Dimensions: ${partData.dimensions.x}mm x ${partData.dimensions.y}mm x ${partData.dimensions.z}mm
Features: ${partData.features.join(', ')}
Tolerance: ${partData.tolerance || 'Standard'}
Surface Finish: ${partData.finish || 'As machined'}
Quantity: ${partData.quantity}

Provide ONLY a numbered list of specific, actionable suggestions to reduce cost while maintaining quality.
Focus on: material alternatives, design simplifications, tolerance relaxation, finish optimization, quantity breaks.`;

    const response = await this.ask(prompt, undefined, { temperature: 0.4 });
    
    // Parse numbered list into array
    const suggestions = response
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(s => s.length > 0);

    return suggestions;
  }

  /**
   * Compare materials and provide recommendation
   */
  async compareMaterials(
    materials: string[],
    application: string
  ): Promise<{ recommendation: string; reasoning: string }> {
    const prompt = `Compare these materials for ${application}:
${materials.map((m, i) => `${i + 1}. ${m}`).join('\n')}

Provide:
1. Best recommendation (material name only)
2. Brief reasoning (2-3 sentences)

Format:
RECOMMENDATION: [material name]
REASONING: [explanation]`;

    const response = await this.ask(prompt, undefined, { temperature: 0.3 });
    
    const recommendationMatch = response.match(/RECOMMENDATION:\s*(.+)/i);
    const reasoningMatch = response.match(/REASONING:\s*(.+)/is);
    
    return {
      recommendation: recommendationMatch?.[1]?.trim() || materials[0],
      reasoning: reasoningMatch?.[1]?.trim() || 'Based on typical manufacturing requirements.',
    };
  }

  /**
   * Detect manufacturability issues
   */
  async analyzeManufacturability(
    features: {
      thinWalls?: { thickness: number; locations: number };
      deepPockets?: { depth: number; width: number; count: number };
      tightTolerances?: { tolerance: string; count: number };
      threads?: { type: string; depth: number; count: number };
    }
  ): Promise<{ issues: string[]; suggestions: string[] }> {
    const featureDesc = Object.entries(features)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    const prompt = `Analyze these CNC part features for manufacturability issues:

${featureDesc}

Identify:
1. ISSUES: Potential manufacturing problems (cost, time, quality risks)
2. SUGGESTIONS: How to resolve each issue

Format as:
ISSUES:
- [issue 1]
- [issue 2]

SUGGESTIONS:
- [suggestion 1]
- [suggestion 2]`;

    const response = await this.ask(prompt, undefined, { temperature: 0.3 });
    
    const issuesSection = response.match(/ISSUES:([\s\S]*?)(?=SUGGESTIONS:|$)/i)?.[1] || '';
    const suggestionsSection = response.match(/SUGGESTIONS:([\s\S]*?)$/i)?.[1] || '';
    
    const issues = issuesSection
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(s => s.length > 0);
    
    const suggestions = suggestionsSection
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(s => s.length > 0);

    return { issues, suggestions };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.ollamaHost}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      this.logger.warn(`Ollama health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.ollamaHost}/api/tags`);
      const data = await response.json() as { models: Array<{ name: string }> };
      return data.models.map(m => m.name);
    } catch (error) {
      this.logger.error(`Failed to list models: ${error.message}`);
      return [];
    }
  }
}
