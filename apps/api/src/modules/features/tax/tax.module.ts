/**
 * Step 20: Tax Module
 */

import { Module } from '@nestjs/common';
import { TaxService } from './tax.service';

@Module({
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
