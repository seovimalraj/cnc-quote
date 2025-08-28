import { Injectable, Logger } from '@nestjs/common';
import { Parser } from 'expr-eval';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CacheService } from '../../lib/cache/cache.service';
import {
  DfmRule,
  DfmValidationResponse,
  Severity,
  CncDfmParams,
  SheetMetalDfmParams,
  InjectionMoldingDfmParams,
} from '@cnc-quote/shared';

@Injectable()
export class DfmService {
  private readonly logger = new Logger(DfmService.name);
  private readonly parser = new Parser();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  private async getRules(processType: string): Promise<DfmRule[]> {
    const cacheKey = `dfm_rules:${processType}`;
    
    // Try to get from cache first
    const cached = await this.cache.get<DfmRule[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, get from database
    const { data: rules } = await this.supabase.client
      .from('dfm_rules')
      .select('*')
      .eq('process_type', processType);

    // Cache for 1 hour
    if (rules) {
      await this.cache.set(cacheKey, rules, 3600);
    }

    return rules || [];
  }

  async validateCnc(params: CncDfmParams): Promise<DfmValidationResponse> {
    const rules = await this.getRules('cnc');
    const issues = [];
    let manualReviewRequired = false;

    for (const rule of rules) {
      try {
        const expr = this.parser.parse(rule.condition);
        const result = expr.evaluate(params);

        if (result === true) {
          issues.push({
            rule_id: rule.id,
            name: rule.name,
            severity: rule.severity,
            message: rule.message,
          });

          if (rule.triggers_manual_review) {
            manualReviewRequired = true;
          }
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.id}: ${error.message}`);
      }
    }

    return {
      valid: !issues.some(i => i.severity === Severity.BLOCK),
      issues,
      manual_review_required: manualReviewRequired,
    };
  }

  async validateSheetMetal(params: SheetMetalDfmParams): Promise<DfmValidationResponse> {
    const rules = await this.getRules('sheet_metal');
    const issues = [];
    let manualReviewRequired = false;

    for (const rule of rules) {
      try {
        const expr = this.parser.parse(rule.condition);
        const result = expr.evaluate(params);

        if (result === true) {
          issues.push({
            rule_id: rule.id,
            name: rule.name,
            severity: rule.severity,
            message: rule.message,
          });

          if (rule.triggers_manual_review) {
            manualReviewRequired = true;
          }
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.id}: ${error.message}`);
      }
    }

    return {
      valid: !issues.some(i => i.severity === Severity.BLOCK),
      issues,
      manual_review_required: manualReviewRequired,
    };
  }

  async validateInjectionMolding(params: InjectionMoldingDfmParams): Promise<DfmValidationResponse> {
    const rules = await this.getRules('injection_molding');
    const issues = [];
    let manualReviewRequired = false;

    for (const rule of rules) {
      try {
        const expr = this.parser.parse(rule.condition);
        const result = expr.evaluate(params);

        if (result === true) {
          issues.push({
            rule_id: rule.id,
            name: rule.name,
            severity: rule.severity,
            message: rule.message,
          });

          if (rule.triggers_manual_review) {
            manualReviewRequired = true;
          }
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.id}: ${error.message}`);
      }
    }

    return {
      valid: !issues.some(i => i.severity === Severity.BLOCK),
      issues,
      manual_review_required: manualReviewRequired,
    };
  }
}
