import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { OllamaService } from './ollama.service';
import { EmbeddingsService } from './embeddings.service';
import { MLPredictionsService } from './ml-predictions.service';
import { AIOrchestrator } from './ai-orchestrator.service';
import { AdvancedDfmService } from './advanced-dfm.service';
import { AIController } from './ai.controller';
import { AIModelLifecycleService } from './model-lifecycle.service';
import { QueueModule } from "../../../queues";
import { AI_MODEL_LIFECYCLE_QUEUE } from './model-lifecycle.queue';

@Module({
  imports: [
    ConfigModule,
    QueueModule,
    BullModule.registerQueue({
      name: AI_MODEL_LIFECYCLE_QUEUE,
    }),
  ],
  controllers: [AIController],
  providers: [
    OllamaService,
    EmbeddingsService,
    MLPredictionsService,
    AIOrchestrator,
    AdvancedDfmService,
    AIModelLifecycleService, // Re-enabled - needed by AIController
  ],
  exports: [
    OllamaService,
    EmbeddingsService,
    MLPredictionsService,
    AIOrchestrator,
    AdvancedDfmService,
    AIModelLifecycleService,
  ],
})
export class AIModule {}
