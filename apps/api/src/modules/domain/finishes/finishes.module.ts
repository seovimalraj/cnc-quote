/**
 * Finishes Module
 */

import { Module } from '@nestjs/common';
import { FinishesService } from './finishes.service';
import { FinishesController } from './finishes.controller';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { FormulaModule } from "../../../lib/common/formula/formula.module";

@Module({
  imports: [SupabaseModule, FormulaModule],
  providers: [FinishesService],
  controllers: [FinishesController],
  exports: [FinishesService],
})
export class FinishesModule {}
