/**
 * Finishes Module
 */

import { Module } from '@nestjs/common';
import { FinishesService } from './finishes.service';
import { FinishesController } from './finishes.controller';
import { FormulaModule } from "../../../lib/common/formula/formula.module";

@Module({
  imports: [FormulaModule],
  providers: [FinishesService],
  controllers: [FinishesController],
  exports: [FinishesService],
})
export class FinishesModule {}
