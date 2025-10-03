/**
 * Formula Module
 */

import { Module } from '@nestjs/common';
import { FormulaEvaluator } from './formula-evaluator';

@Module({
  providers: [FormulaEvaluator],
  exports: [FormulaEvaluator],
})
export class FormulaModule {}
