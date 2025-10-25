/**
 * Step 14: Lookups Module
 */

import { Module } from '@nestjs/common';
import { LookupsController } from './lookups.controller';
import { OutcomesModule } from '../quotes-legacy/outcomes/outcomes.module';

@Module({
  imports: [OutcomesModule],
  controllers: [LookupsController],
})
export class LookupsModule {}
