import { Injectable, Logger } from "@nestjs/common";
import { Parser } from "expr-eval";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { CacheService } from "../../lib/cache/cache.service";
import {
  DfmRule,
  DfmValidationResponse,
  Severity,
  CncDfmParams,
  SheetMetalDfmParams,
  InjectionMoldingDfmParams,
  DfmValidationRequest,
  DfmBatchValidation,
  DfmBatchValidationResponse,
  DfmRuleResult,
  DfmRuleEvaluationContext,
} from "@cnc-quote/shared";

// Severity enum values
const SEVERITY_BLOCK = 'block';
const SEVERITY_WARN = 'warn';

// Convert a strongly typed params object to a loose record type for expr-eval
function toDfmParams<T>(params: T): Record<string, number> {
  return params as unknown as Record<string, number>;
}

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
    const { data: rules } = await this.supabase.client.from("dfm_rules").select("*").eq("process_type", processType);

    // Cache for 1 hour
    if (rules) {
      await this.cache.set(cacheKey, rules, 3600);
    }

    return rules || [];
  }

  async validateCnc(params: CncDfmParams): Promise<DfmValidationResponse> {
    const rules = await this.getRules("cnc");
    const issues = [];
    let manualReviewRequired = false;

    for (const rule of rules) {
      try {
        const expr = this.parser.parse(rule.condition);
        const result = expr.evaluate(toDfmParams(params));

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
      valid: !issues.some((i) => i.severity === SEVERITY_BLOCK),
      issues,
      manual_review_required: manualReviewRequired,
    };
  }

  async validateSheetMetal(params: SheetMetalDfmParams): Promise<DfmValidationResponse> {
    const rules = await this.getRules("sheet_metal");
    const issues = [];
    let manualReviewRequired = false;

    for (const rule of rules) {
      try {
        const expr = this.parser.parse(rule.condition);
        const result = expr.evaluate(toDfmParams(params));

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
      valid: !issues.some((i) => i.severity === SEVERITY_BLOCK),
      issues,
      manual_review_required: manualReviewRequired,
    };
  }

  async validateInjectionMolding(params: InjectionMoldingDfmParams): Promise<DfmValidationResponse> {
    const rules = await this.getRules("injection_molding");
    const issues = [];
    let manualReviewRequired = false;

    for (const rule of rules) {
      try {
        const expr = this.parser.parse(rule.condition);
        const result = expr.evaluate(toDfmParams(params));

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
      valid: !issues.some((i) => i.severity === SEVERITY_BLOCK),
      issues,
      manual_review_required: manualReviewRequired,
    };
  }

  async validateDesign(request: DfmValidationRequest): Promise<DfmValidationResponse> {
    const startTime = Date.now();
    const rules = await this.getRules(request.process_type);
    const issues = [];
    let manualReviewRequired = false;

    // Create evaluation context
    const context: DfmRuleEvaluationContext = {
      geometry: request.geometry_data,
      material: request.material_properties,
      process: request.design_parameters,
      design: request.design_parameters,
    };

    for (const rule of rules) {
      // Skip rules if specified
      if (request.skip_rules?.includes(rule.id)) {
        continue;
      }

      try {
        const ruleStartTime = Date.now();
        const expr = this.parser.parse(rule.condition);
        const result = expr.evaluate({
          ...toDfmParams(context.geometry),
          ...toDfmParams(context.material || {}),
          ...toDfmParams(context.process || {}),
          ...toDfmParams(context.design || {}),
        });

        const evaluationTime = Date.now() - ruleStartTime;

        if (result === true) {
          issues.push({
            rule_id: rule.id,
            name: rule.name,
            severity: rule.severity,
            message: rule.message,
            details: {
              evaluation_time_ms: evaluationTime,
              context: context,
            },
          });

          if (rule.triggers_manual_review) {
            manualReviewRequired = true;
          }
        }
      } catch (error) {
        this.logger.error(`Error evaluating rule ${rule.id}: ${error.message}`);
      }
    }

    const processingTime = Date.now() - startTime;
    const blockerCount = issues.filter(i => i.severity === SEVERITY_BLOCK).length;
    const warningCount = issues.filter(i => i.severity === SEVERITY_WARN).length;

    return {
      valid: blockerCount === 0,
      issues,
      manual_review_required: manualReviewRequired,
      summary: {
        total_issues: issues.length,
        blocker_count: blockerCount,
        warning_count: warningCount,
        info_count: 0, // Not implemented yet
      },
      processing_time_ms: processingTime,
    };
  }

  async validateBatch(batchRequest: DfmBatchValidation): Promise<DfmBatchValidationResponse> {
    const startTime = Date.now();
    const results: DfmValidationResponse[] = [];
    let totalIssues = 0;
    let manualReviewsRequired = 0;

    if (batchRequest.parallel_processing) {
      // Process in parallel
      const promises = batchRequest.requests.map(request =>
        this.validateDesign(request).catch(error => {
          this.logger.error(`Batch validation error for quote ${request.quote_id}: ${error.message}`);
          return {
            valid: false,
            issues: [{
              rule_id: 'system-error',
              name: 'Validation Error',
              severity: SEVERITY_BLOCK,
              message: `Failed to validate design: ${error.message}`,
            }],
            manual_review_required: true,
          } as DfmValidationResponse;
        })
      );

      if (batchRequest.fail_fast) {
        try {
          results.push(...await Promise.all(promises));
        } catch (error) {
          this.logger.error(`Batch validation failed: ${error.message}`);
          throw error;
        }
      } else {
        const settledResults = await Promise.allSettled(promises);
        for (const result of settledResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push({
              valid: false,
              issues: [{
                rule_id: 'system-error',
                name: 'Validation Error',
                severity: SEVERITY_BLOCK,
                message: `Failed to validate design: ${result.reason.message}`,
              }],
              manual_review_required: true,
            });
          }
        }
      }
    } else {
      // Process sequentially
      for (const request of batchRequest.requests) {
        try {
          const result = await this.validateDesign(request);
          results.push(result);

          if (!result.valid && batchRequest.fail_fast) {
            break;
          }
        } catch (error) {
          this.logger.error(`Sequential validation error for quote ${request.quote_id}: ${error.message}`);
          results.push({
            valid: false,
            issues: [{
              rule_id: 'system-error',
              name: 'Validation Error',
              severity: SEVERITY_BLOCK,
              message: `Failed to validate design: ${error.message}`,
            }],
            manual_review_required: true,
          });

          if (batchRequest.fail_fast) {
            break;
          }
        }
      }
    }

    // Calculate summary
    const successfulValidations = results.filter(r => r.valid).length;
    const failedValidations = results.length - successfulValidations;

    for (const result of results) {
      totalIssues += result.issues?.length || 0;
      if (result.manual_review_required) {
        manualReviewsRequired++;
      }
    }

    const processingTime = Date.now() - startTime;

    return {
      results,
      summary: {
        total_requests: batchRequest.requests.length,
        successful_validations: successfulValidations,
        failed_validations: failedValidations,
        total_issues: totalIssues,
        manual_reviews_required: manualReviewsRequired,
      },
      processing_time_ms: processingTime,
    };
  }

  async getDfmRules(
    orgId: string,
    filters?: {
      processType?: string;
      severity?: 'warn' | 'block';
      activeOnly?: boolean;
    }
  ): Promise<DfmRule[]> {
    let query = this.supabase.client
      .from('dfm_rules')
      .select('*')
      .eq('organization_id', orgId);

    if (filters?.processType) {
      query = query.eq('process_type', filters.processType);
    }

    if (filters?.severity) {
      query = query.eq('severity', filters.severity);
    }

    if (filters?.activeOnly) {
      // Assuming there's an 'active' field, or we can filter by created_at/updated_at
      query = query.not('updated_at', 'is', null);
    }

    const { data: rules, error } = await query.order('created_at', { ascending: false });

    if (error) {
      this.logger.error(`Error fetching DFM rules: ${error.message}`);
      throw error;
    }

    return rules || [];
  }

  async createDfmRule(
    orgId: string,
    ruleData: Omit<DfmRule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>
  ): Promise<DfmRule> {
    const newRule = {
      ...ruleData,
      organization_id: orgId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: rule, error } = await this.supabase.client
      .from('dfm_rules')
      .insert(newRule)
      .select()
      .single();

    if (error) {
      this.logger.error(`Error creating DFM rule: ${error.message}`);
      throw error;
    }

    // Invalidate cache
    const cacheKey = `dfm_rules:${ruleData.process_type}`;
    await this.cache.del(cacheKey);

    return rule;
  }
}
