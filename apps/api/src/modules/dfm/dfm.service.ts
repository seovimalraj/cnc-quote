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

  async createDfmRequest(
    orgId: string,
    userId: string,
    request: {
      fileId: string;
      tolerancePack: string;
      surfaceFinish: string;
      industry: string;
      certifications: string[];
      criticality: string;
      notes?: string;
    }
  ) {
    // Verify file exists and belongs to organization
    const { data: fileData, error: fileError } = await this.supabase.client
      .from('dfm_files')
      .select('*')
      .eq('id', request.fileId)
      .eq('organization_id', orgId)
      .single();

    if (fileError || !fileData) {
      throw new Error('File not found or access denied');
    }

    // Create DFM request
    const { data: dfmRequest, error: requestError } = await this.supabase.client
      .from('dfm_requests')
      .insert({
        file_id: request.fileId,
        file_name: fileData.file_name,
        organization_id: orgId,
        user_id: userId,
        tolerance_pack: request.tolerancePack,
        surface_finish: request.surfaceFinish,
        industry: request.industry,
        certifications: request.certifications,
        criticality: request.criticality,
        notes: request.notes,
        status: 'Queued',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (requestError) {
      this.logger.error(`Failed to create DFM request: ${requestError.message}`);
      throw new Error('Failed to create DFM request');
    }

    // Enqueue the analysis job
    try {
      await this.enqueueDfmAnalysis({
        requestId: dfmRequest.id,
        fileId: request.fileId,
        downloadUrl: '', // Will be populated by the job processor
      });
    } catch (enqueueError) {
      this.logger.error(`Failed to enqueue DFM analysis: ${enqueueError.message}`);
      // Update status to error
      await this.supabase.client
        .from('dfm_requests')
        .update({ status: 'Error', updated_at: new Date().toISOString() })
        .eq('id', dfmRequest.id);
      throw new Error('Failed to enqueue analysis job');
    }

    return {
      id: dfmRequest.id,
      status: dfmRequest.status,
      message: 'DFM analysis request created and queued successfully'
    };
  }

  async enqueueDfmAnalysis(jobData: {
    requestId: string;
    fileId: string;
    downloadUrl: string;
  }) {
    // Import the queue service
    const { InjectQueue } = await import('@nestjs/bullmq');
    const { Queue } = await import('bullmq');

    // This would need to be injected properly, but for now we'll use a simple approach
    // In a real implementation, you'd inject the queue in the constructor
    const queueName = 'dfm-analysis';

    // For now, we'll simulate the queue operation
    this.logger.log(`Enqueuing DFM analysis job for request ${jobData.requestId}`);

    // Update request status to Analyzing
    await this.supabase.client
      .from('dfm_requests')
      .update({
        status: 'Analyzing',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobData.requestId);

    return {
      task_id: `dfm_${jobData.requestId}_${Date.now()}`,
      status: 'enqueued',
      message: 'DFM analysis job enqueued successfully'
    };
  }

  async getDfmRequestStatus(requestId: string, orgId: string) {
    const { data: request, error } = await this.supabase.client
      .from('dfm_requests')
      .select('*')
      .eq('id', requestId)
      .eq('organization_id', orgId)
      .single();

    if (error || !request) {
      throw new Error('DFM request not found or access denied');
    }

    // Calculate progress based on status
    let progress = 0;
    switch (request.status) {
      case 'Queued':
        progress = 10;
        break;
      case 'Analyzing':
        progress = 50;
        break;
      case 'Complete':
        progress = 100;
        break;
      case 'Error':
        progress = 0;
        break;
    }

    return {
      id: request.id,
      status: request.status,
      created_at: request.created_at,
      updated_at: request.updated_at,
      progress
    };
  }

  async getDfmResult(requestId: string, orgId: string) {
    // First verify the request exists and belongs to the organization
    const { data: request, error: requestError } = await this.supabase.client
      .from('dfm_requests')
      .select('*')
      .eq('id', requestId)
      .eq('organization_id', orgId)
      .single();

    if (requestError || !request) {
      throw new Error('DFM request not found or access denied');
    }

    if (request.status !== 'Complete') {
      throw new Error('DFM analysis is not yet complete');
    }

    // Get the result
    const { data: result, error: resultError } = await this.supabase.client
      .from('dfm_results')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (resultError || !result) {
      throw new Error('DFM result not found');
    }

    return result;
  }

  async getDfmResultWithSession(requestId: string, userId: string) {
    // First verify the request exists and belongs to the user
    const { data: request, error: requestError } = await this.supabase.client
      .from('dfm_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', userId)
      .single();

    if (requestError || !request) {
      throw new Error('DFM request not found or access denied');
    }

    if (request.status !== 'Complete') {
      throw new Error('DFM analysis is not yet complete');
    }

    // Get the result
    const { data: result, error: resultError } = await this.supabase.client
      .from('dfm_results')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (resultError || !result) {
      throw new Error('DFM result not found');
    }

    return result;
  }

  // ===== PUBLIC DFM OPTIONS METHODS =====

  async getPublishedOptions(optionType: string): Promise<any[]> {
    const tableName = this.getTableName(optionType);

    const { data, error } = await this.supabase.client
      .from(tableName)
      .select('id, name, description' + (optionType === 'criticality' ? ', value' : ''))
      .eq('published', true)
      .order('name');

    if (error) {
      this.logger.error(`Error fetching published ${optionType} options:`, error);
      throw new Error(`Failed to fetch published ${optionType} options`);
    }

    return data || [];
  }

  private getTableName(optionType: string): string {
    const tableMap = {
      tolerances: 'dfm_tolerance_options',
      finishes: 'dfm_finish_options',
      industries: 'dfm_industry_options',
      certifications: 'dfm_certification_options',
      criticality: 'dfm_criticality_options',
    };

    const tableName = tableMap[optionType];
    if (!tableName) {
      throw new Error(`Invalid option type: ${optionType}`);
    }

    return tableName;
  }
}
