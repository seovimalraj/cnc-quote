import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { OllamaService, OllamaChatRequest } from './ollama.service';

@Controller('v1')
export class OpenAIProxyController {
  private readonly logger = new Logger(OpenAIProxyController.name);
  constructor(private readonly ollama: OllamaService) {}

  @Post('chat/completions')
  async chatCompletions(@Body() body: any) {
    // Translate OpenAI style body to Ollama simple chat request
    try {
      const messages = (body.messages || body.prompt || []).map((m: any) => {
        if (typeof m === 'string') return { role: 'user', content: m };
        return { role: m.role || 'user', content: m.content || m }; 
      });
      const result = await this.ollama.chat(messages as any, { model: body.model, temperature: body.temperature });
      return { 
        id: 'ollama-'+Date.now(), 
        object: 'chat.completion', 
        model: result.model, 
        choices: [{ message: result.message, finish_reason: result.done ? 'stop' : null }], 
        usage: {} 
      };
    } catch (err: any) {
      this.logger.error('chatCompletions error', err?.stack || err?.message || err);
      throw new HttpException('LLM chat error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('embeddings')
  async embeddings(@Body() body: any) {
    try {
      const input = body.input || body.inputs || '';
      const inputText = Array.isArray(input) ? input[0] : input;
      
      // Generate embedding via Ollama
      const embedding = await this.ollama.embed(inputText, body.model);
      
      // Return OpenAI-compatible format
      return {
        object: 'list',
        data: [{ object: 'embedding', embedding, index: 0 }],
        model: body.model || 'bge-m3',
        usage: { prompt_tokens: inputText.length, total_tokens: inputText.length }
      };
    } catch (err: any) {
      this.logger.error('embeddings error', err?.stack || err?.message || err);
      throw new HttpException('LLM embeddings error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
