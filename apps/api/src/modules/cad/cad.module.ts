import { Module } from '@nestjs/common';
import { CadController } from './cad.controller';
import { CadService } from './cad.service';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { FilesModule } from '../files/files.module';
import { CadProcessor } from './cad.processor';

@Module({
  imports: [
    HttpModule.register({
      timeout: 60000,  // 1 minute timeout for CAD operations
      maxRedirects: 5,
    }),
    BullModule.registerQueue({
      name: 'cad',
    }),
    FilesModule,
  ],
  controllers: [CadController],
  providers: [CadService, CadProcessor],
  exports: [CadService],
})
export class CadModule {}
