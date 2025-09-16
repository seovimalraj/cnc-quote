import { Controller, Post, Body, UseGuards, Get, Query, Param, UnauthorizedException, Inject, Req, Ip } from "@nestjs/common";
import { DfmService } from "./dfm.service";
import { DfmAuthGuard } from "../../auth/dfm-auth.guard";
import { AllowSession } from "../../auth/allow-session.decorator";
import { User } from "../../auth/user.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from "@nestjs/swagger";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { AnalyticsService } from "../analytics/analytics.service";
import { RateLimitService } from "../../lib/rate-limit/rate-limit.service";
import { Request } from "express";
import {
  CncDfmParams,
  SheetMetalDfmParams,
  InjectionMoldingDfmParams,
  DfmValidationResponse,
  DfmRule,
  DfmValidationRequest,
  DfmBatchValidation,
  DfmBatchValidationResponse
} from "@cnc-quote/shared";

@ApiTags("DFM")
@Controller("dfm")
@UseGuards(DfmAuthGuard)
@ApiBearerAuth()
export class DfmController {
  constructor(
    private readonly dfmService: DfmService,
    private readonly supabaseService: SupabaseService,
    private readonly analyticsService: AnalyticsService,
    private readonly rateLimitService: RateLimitService,
  ) {}

  @Post("validate")
  @ApiOperation({
    summary: "Validate design for manufacturability",
    description: "Validate a design configuration against DFM rules for the specified process type"
  })
  @ApiResponse({
    status: 200,
    description: "DFM validation completed",
    schema: {
      type: "object",
      properties: {
        valid: { type: "boolean" },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              rule_id: { type: "string" },
              name: { type: "string" },
              severity: { type: "string", enum: ["warn", "block"] },
              message: { type: "string" },
              details: { type: "object" },
              location: {
                type: "object",
                properties: {
                  x: { type: "number" },
                  y: { type: "number" },
                  z: { type: "number" }
                }
              },
              suggestion: { type: "string" }
            }
          }
        },
        manual_review_required: { type: "boolean" },
        summary: {
          type: "object",
          properties: {
            total_issues: { type: "number" },
            blocker_count: { type: "number" },
            warning_count: { type: "number" },
            info_count: { type: "number" }
          }
        },
        processing_time_ms: { type: "number" }
      }
    }
  })
  @ApiResponse({ status: 400, description: "Invalid DFM validation request" })
  async validateDesign(@Body() request: DfmValidationRequest): Promise<DfmValidationResponse> {
    return this.dfmService.validateDesign(request);
  }

  @Post("validate/batch")
  @ApiOperation({
    summary: "Batch validate multiple designs",
    description: "Validate multiple design configurations in a single request"
  })
  @ApiResponse({
    status: 200,
    description: "Batch DFM validation completed",
    schema: {
      type: "object",
      properties: {
        results: {
          type: "array",
          items: { $ref: "#/components/schemas/DfmValidationResponse" }
        },
        summary: {
          type: "object",
          properties: {
            total_requests: { type: "number" },
            successful_validations: { type: "number" },
            failed_validations: { type: "number" },
            total_issues: { type: "number" },
            manual_reviews_required: { type: "number" }
          }
        },
        processing_time_ms: { type: "number" }
      }
    }
  })
  async validateBatch(@Body() batchRequest: DfmBatchValidation): Promise<DfmBatchValidationResponse> {
    return this.dfmService.validateBatch(batchRequest);
  }

  @Get("rules")
  @ApiOperation({
    summary: "Get DFM rules",
    description: "Retrieve DFM rules for the organization"
  })
  @ApiQuery({ name: 'process_type', required: false, description: 'Filter by process type' })
  @ApiQuery({ name: 'severity', required: false, description: 'Filter by severity' })
  @ApiQuery({ name: 'active_only', required: false, description: 'Return only active rules' })
  @ApiResponse({
    status: 200,
    description: "DFM rules retrieved successfully",
    type: [Object]
  })
  async getDfmRules(
    @User('org_id') orgId: string,
    @Query('process_type') processType?: string,
    @Query('severity') severity?: 'warn' | 'block',
    @Query('active_only') activeOnly?: boolean,
  ): Promise<DfmRule[]> {
    return this.dfmService.getDfmRules(orgId, { processType, severity, activeOnly });
  }

  @Post("rules")
  @ApiOperation({
    summary: "Create DFM rule",
    description: "Create a new DFM rule for the organization"
  })
  @ApiResponse({
    status: 201,
    description: "DFM rule created successfully",
    type: Object
  })
  async createDfmRule(
    @User('org_id') orgId: string,
    @Body() rule: Omit<DfmRule, 'id' | 'organization_id' | 'created_at' | 'updated_at'>,
  ): Promise<DfmRule> {
    return this.dfmService.createDfmRule(orgId, rule);
  }

  // Legacy endpoints for backward compatibility
  @Post("cnc")
  @ApiOperation({
    summary: "Validate CNC design (legacy)",
    description: "Legacy endpoint for CNC DFM validation"
  })
  @ApiResponse({
    status: 200,
    description: "CNC DFM validation completed",
    type: Object
  })
  async validateCnc(@Body() params: CncDfmParams): Promise<DfmValidationResponse> {
    return this.dfmService.validateCnc(params);
  }

  @Post("sheet-metal")
  @ApiOperation({
    summary: "Validate sheet metal design (legacy)",
    description: "Legacy endpoint for sheet metal DFM validation"
  })
  @ApiResponse({
    status: 200,
    description: "Sheet metal DFM validation completed",
    type: Object
  })
  async validateSheetMetal(@Body() params: SheetMetalDfmParams): Promise<DfmValidationResponse> {
    return this.dfmService.validateSheetMetal(params);
  }

  @Post("injection-molding")
  @ApiOperation({
    summary: "Validate injection molding design (legacy)",
    description: "Legacy endpoint for injection molding DFM validation"
  })
  @ApiResponse({
    status: 200,
    description: "Injection molding DFM validation completed",
    type: Object
  })
  async validateInjectionMolding(@Body() params: InjectionMoldingDfmParams): Promise<DfmValidationResponse> {
    return this.dfmService.validateInjectionMolding(params);
  }

  // DFM Analysis Workflow Endpoints
  @Post("requests")
  @ApiOperation({
    summary: "Create DFM analysis request",
    description: "Create a new DFM analysis request with CAD file and specifications"
  })
  @ApiResponse({
    status: 201,
    description: "DFM request created successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["Queued", "Analyzing", "Complete", "Error"] },
        message: { type: "string" }
      }
    }
  })
  async createDfmRequest(
    @User('org_id') orgId: string,
    @User('id') userId: string,
    @Body() request: {
      fileId: string;
      tolerancePack: string;
      surfaceFinish: string;
      industry: string;
      certifications: string[];
      criticality: string;
      notes?: string;
    },
    @Req() req: Request,
    @Ip() ipAddress: string,
  ) {
    // Check rate limit for DFM submissions
    const rateLimitResult = await this.rateLimitService.checkRateLimit(
      ipAddress,
      'dfm_submit'
    );

    if (!rateLimitResult.allowed) {
      throw new UnauthorizedException('Rate limit exceeded. Please try again later.');
    }

    const result = await this.dfmService.createDfmRequest(orgId, userId, request);

    // Track analytics
    await this.analyticsService.trackRequestCreated(result.id, {
      fileId: request.fileId,
      tolerancePack: request.tolerancePack,
      surfaceFinish: request.surfaceFinish,
      industry: request.industry,
      criticality: request.criticality,
      certifications: request.certifications,
      ipAddress,
      userAgent: req.headers['user-agent'],
    });

    return result;
  }

  @Post("analyze")
  @ApiOperation({
    summary: "Enqueue DFM analysis job",
    description: "Enqueue a DFM analysis job for processing"
  })
  @ApiResponse({
    status: 200,
    description: "DFM analysis job enqueued",
    schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        status: { type: "string" },
        message: { type: "string" }
      }
    }
  })
  async enqueueDfmAnalysis(
    @Body() jobData: {
      requestId: string;
      fileId: string;
      downloadUrl: string;
    },
    @User('org_id') orgId: string,
    @User('id') userId: string,
    @Req() req: Request,
    @Ip() ipAddress: string,
  ) {
    const result = await this.dfmService.enqueueDfmAnalysis(jobData);

    // Track analytics
    await this.analyticsService.trackAnalysisStarted(jobData.requestId, {
      fileId: jobData.fileId,
      ipAddress,
      userAgent: req.headers['user-agent'],
    });

    return result;
  }

  @Get("requests/:id/status")
  @ApiOperation({
    summary: "Get DFM request status",
    description: "Get the current status of a DFM analysis request"
  })
  @ApiParam({ name: 'id', description: 'DFM request ID' })
  @ApiResponse({
    status: 200,
    description: "DFM request status retrieved",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        status: { type: "string", enum: ["Queued", "Analyzing", "Complete", "Error"] },
        created_at: { type: "string", format: "date-time" },
        updated_at: { type: "string", format: "date-time" },
        progress: { type: "number", minimum: 0, maximum: 100 }
      }
    }
  })
  async getDfmRequestStatus(
    @Param('id') requestId: string,
    @User('org_id') orgId: string,
    @Req() req: Request,
    @Ip() ipAddress: string,
  ) {
    const result = await this.dfmService.getDfmRequestStatus(requestId, orgId);

    // Track analytics
    await this.analyticsService.trackStatusChecked(requestId, {
      status: result.status,
      ipAddress,
      userAgent: req.headers['user-agent'],
    });

    return result;
  }

  @Get("requests/:id/result")
  @AllowSession()
  @ApiOperation({
    summary: "Get DFM analysis result",
    description: "Get the complete DFM analysis result for a request"
  })
  @ApiParam({ name: 'id', description: 'DFM request ID' })
  @ApiResponse({
    status: 200,
    description: "DFM analysis result retrieved",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        request_id: { type: "string" },
        checks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string" },
              name: { type: "string" },
              state: { type: "string", enum: ["pass", "warning", "blocker"] },
              details: { type: "object" },
              highlights: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        },
        summary: { type: "object" },
        viewer_mesh_id: { type: "string" },
        report_pdf_id: { type: "string" },
        qap_pdf_id: { type: "string" },
        created_at: { type: "string", format: "date-time" }
      }
    }
  })
  async getDfmResult(
    @Param('id') requestId: string,
    @User('org_id') orgId: string,
    @Req() req: Request,
    @Ip() ipAddress: string,
  ) {
    const result = await this.dfmService.getDfmResult(requestId, orgId);

    // Track analytics
    await this.analyticsService.trackResultViewed(requestId, {
      ipAddress,
      userAgent: req.headers['user-agent'],
      isSessionAuth: (req as any).isSessionAuth || false,
    });

    return result;
  }

  @Get("requests/:id/result/session")
  @ApiOperation({
    summary: "Get DFM analysis result with session token",
    description: "Get the complete DFM analysis result for a request using a session token (for invited users)"
  })
  @ApiParam({ name: 'id', description: 'DFM request ID' })
  @ApiQuery({ name: 'sessionToken', description: 'Session token for access', required: false })
  @ApiResponse({
    status: 200,
    description: "DFM analysis result retrieved",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        request_id: { type: "string" },
        checks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              code: { type: "string" },
              name: { type: "string" },
              state: { type: "string", enum: ["pass", "warning", "blocker"] },
              details: { type: "object" },
              highlights: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        },
        summary: { type: "object" },
        viewer_mesh_id: { type: "string" },
        report_pdf_id: { type: "string" },
        qap_pdf_id: { type: "string" },
        created_at: { type: "string", format: "date-time" }
      }
    }
  })
  async getDfmResultWithSession(
    @Param('id') requestId: string,
    @Query('sessionToken') sessionToken?: string,
    @Req() req: Request,
  ) {
    // Validate session token
    if (!sessionToken) {
      throw new UnauthorizedException('Session token required');
    }

    const supabase = this.supabaseService.client;

    // Validate session token
    const { data: session, error } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at, user:user_id(*)')
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !session) {
      throw new UnauthorizedException('Invalid or expired session token');
    }

    // Check if the DFM request belongs to this user
    const { data: dfmRequest, error: dfmError } = await supabase
      .from('dfm_requests')
      .select('id, user_id')
      .eq('id', requestId)
      .eq('user_id', session.user_id)
      .single();

    if (dfmError || !dfmRequest) {
      throw new UnauthorizedException('Access denied to this DFM result');
    }

    const result = await this.dfmService.getDfmResultWithSession(requestId, session.user_id);

    // Track analytics for session-based access
    await this.analyticsService.trackResultViewed(requestId, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      isSessionAuth: true,
      sessionToken: sessionToken,
    });

    return result;

    return result;
  }

  // ===== PUBLIC DFM OPTIONS ENDPOINTS =====

  @Get("options/tolerances")
  @ApiOperation({
    summary: "Get published tolerance options",
    description: "Retrieve all published tolerance pack options for DFM analysis"
  })
  @ApiResponse({
    status: 200,
    description: "Published tolerance options retrieved",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" }
        }
      }
    }
  })
  async getPublishedToleranceOptions() {
    return this.dfmService.getPublishedOptions('tolerances');
  }

  @Get("options/finishes")
  @ApiOperation({
    summary: "Get published finish options",
    description: "Retrieve all published surface finish options for DFM analysis"
  })
  @ApiResponse({
    status: 200,
    description: "Published finish options retrieved",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" }
        }
      }
    }
  })
  async getPublishedFinishOptions() {
    return this.dfmService.getPublishedOptions('finishes');
  }

  @Get("options/industries")
  @ApiOperation({
    summary: "Get published industry options",
    description: "Retrieve all published industry options for DFM analysis"
  })
  @ApiResponse({
    status: 200,
    description: "Published industry options retrieved",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" }
        }
      }
    }
  })
  async getPublishedIndustryOptions() {
    return this.dfmService.getPublishedOptions('industries');
  }

  @Get("options/certifications")
  @ApiOperation({
    summary: "Get published certification options",
    description: "Retrieve all published certification options for DFM analysis"
  })
  @ApiResponse({
    status: 200,
    description: "Published certification options retrieved",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          description: { type: "string" }
        }
      }
    }
  })
  async getPublishedCertificationOptions() {
    return this.dfmService.getPublishedOptions('certifications');
  }

  @Get("options/criticality")
  @ApiOperation({
    summary: "Get published criticality options",
    description: "Retrieve all published criticality level options for DFM analysis"
  })
  @ApiResponse({
    status: 200,
    description: "Published criticality options retrieved",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          value: { type: "string" },
          description: { type: "string" }
        }
      }
    }
  })
  async getPublishedCriticalityOptions() {
    return this.dfmService.getPublishedOptions('criticality');
  }
}
