import { Controller, Post, Body, UseGuards, Get, Query } from "@nestjs/common";
import { DfmService } from "./dfm.service";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { User } from "../../auth/user.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
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
@UseGuards(JwtAuthGuard, OrgGuard)
@ApiBearerAuth()
export class DfmController {
  constructor(private readonly dfmService: DfmService) {}

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
}
