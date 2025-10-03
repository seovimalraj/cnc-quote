import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OllamaService } from './ollama.service';
import { EmbeddingsService } from './embeddings.service';
import { MLPredictionsService } from './ml-predictions.service';
import { AIOrchestrator } from './ai-orchestrator.service';
import { AdvancedDfmService } from './advanced-dfm.service';
import { AIController } from './ai.controller';

@Module({
  imports: [ConfigModule],
  controllers: [AIController],
  providers: [
    OllamaService,
    EmbeddingsService,
    MLPredictionsService,
    AIOrchestrator,
    AdvancedDfmService,
  ],
  exports: [
    OllamaService,
    EmbeddingsService,
    MLPredictionsService,
    AIOrchestrator,
    AdvancedDfmService,
  ],
})
export class AIModule {}
