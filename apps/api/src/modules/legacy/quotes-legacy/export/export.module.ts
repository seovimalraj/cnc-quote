/**
 * Step 14: Export Module
 */

import { Module } from '@nestjs/common';
import { ExportController } from './export.controller';
import { MarginsModule } from "../margins/margins.module";

@Module({
  imports: [MarginsModule],
  controllers: [ExportController],
})
export class ExportModule {}
