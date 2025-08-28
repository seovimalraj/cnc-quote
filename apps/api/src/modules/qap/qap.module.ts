import { Module } from '@nestjs/common';
import { QapService } from './qap.service';
import { QapController } from './qap.controller';
import { QapProcessor } from './qap.processor';
import { BullModule } from '@nestjs/bull';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'qap',
    }),
  ],
  providers: [QapService, QapProcessor],
  controllers: [QapController],
  exports: [QapService],
})
export class QapModule {}
