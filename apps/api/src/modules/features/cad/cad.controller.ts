import { Controller, Post, Body, UseGuards, Get, Param, Query } from "@nestjs/common";
import { CadService } from "./cad.service";
import { JwtAuthGuard } from "../../core/auth/jwt.guard";
import { OrgGuard } from "../../core/auth/org.guard";
import { User } from "../../core/auth/user.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { QueueAnalysisDto, GetAnalysisResultDto, GetPreviewDto, TaskResponseDto } from "./cad.dto";
import { CadAnalysisResult, CadAnalysisRequest, CadAnalysisResult as CadAnalysisResultType, CadPreviewRequest, CadPreviewResult, CadTaskStatus } from "./cad.types";

@ApiTags("CAD")
@Controller("cad")
@UseGuards(JwtAuthGuard, OrgGuard)
@ApiBearerAuth()
export class CadController {
  constructor(private readonly cadService: CadService) {}

  @Post("analyze")
  @ApiOperation({
    summary: "Queue CAD file analysis",
    description: "Enqueue a CAD file for analysis including geometry extraction, feature detection, and complexity scoring"
  })
  @ApiResponse({
    status: 201,
    description: "Analysis task queued successfully",
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input or file not ready" })
  @ApiResponse({ status: 404, description: "File not found" })
  async analyzeFile(@Body() dto: QueueAnalysisDto, @User("sub") userId: string): Promise<TaskResponseDto> {
    return this.cadService.queueAnalysis(dto.fileId, userId);
  }

  @Get("analysis/:taskId")
  @ApiOperation({
    summary: "Get CAD analysis result",
    description: "Retrieve the results of a CAD analysis task including geometry features, dimensions, and complexity metrics"
  })
  @ApiResponse({
    status: 200,
    description: "CAD processing result",
    schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        file_id: { type: "string" },
        status: { type: "string", enum: ["Queued", "Processing", "Succeeded", "Failed"] },
        features: { type: "object" },
        dimensions: { type: "object" },
        complexity: { type: "object" },
        mesh: { type: "object" },
        error_code: { type: "string" },
        error_message: { type: "string" },
        processing_started_at: { type: "string", format: "date-time" },
        processing_completed_at: { type: "string", format: "date-time" },
        created_at: { type: "string", format: "date-time" },
        updated_at: { type: "string", format: "date-time" }
      },
    },
  })
  @ApiResponse({ status: 404, description: "Task not found" })
  async getAnalysisResult(@Param() dto: GetAnalysisResultDto): Promise<CadAnalysisResultType> {
    return this.cadService.getAnalysisResult(dto.taskId);
  }

  @Post("preview")
  @ApiOperation({
    summary: "Queue CAD file preview generation",
    description: "Generate a 3D preview mesh for CAD visualization in the frontend"
  })
  @ApiResponse({
    status: 201,
    description: "Preview generation task queued successfully",
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input or file not ready" })
  @ApiResponse({ status: 404, description: "File not found" })
  async generatePreview(@Body() dto: GetPreviewDto, @User("sub") userId: string): Promise<TaskResponseDto> {
    return this.cadService.getPreview(dto.fileId, userId);
  }

  @Get("preview/:fileId")
  @ApiOperation({
    summary: "Get CAD preview mesh data",
    description: "Retrieve decimated mesh data for 3D visualization"
  })
  @ApiQuery({ name: 'format', enum: ['gltf', 'obj', 'stl'], required: false, description: 'Preview format' })
  @ApiQuery({ name: 'quality', enum: ['low', 'medium', 'high'], required: false, description: 'Preview quality' })
  @ApiResponse({
    status: 200,
    description: "CAD preview data",
    schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        file_id: { type: "string" },
        status: { type: "string", enum: ["Queued", "Processing", "Succeeded", "Failed"] },
        format: { type: "string" },
        quality: { type: "string" },
        url: { type: "string", format: "uri" },
        thumbnail_url: { type: "string", format: "uri" },
        file_size_bytes: { type: "number" },
        error_code: { type: "string" },
        error_message: { type: "string" },
        processing_started_at: { type: "string", format: "date-time" },
        processing_completed_at: { type: "string", format: "date-time" },
        created_at: { type: "string", format: "date-time" },
        updated_at: { type: "string", format: "date-time" }
      },
    },
  })
  @ApiResponse({ status: 404, description: "File or preview not found" })
  async getPreviewData(
    @Param('fileId') fileId: string,
    @Query('format') format: 'gltf' | 'obj' | 'stl' = 'gltf',
    @Query('quality') quality: 'low' | 'medium' | 'high' = 'medium'
  ): Promise<CadPreviewResult> {
    return this.cadService.getPreviewData(fileId, format, quality);
  }

  @Get("task/:taskId/status")
  @ApiOperation({
    summary: "Get CAD task status",
    description: "Check the current status and progress of a CAD processing task"
  })
  @ApiResponse({
    status: 200,
    description: "Task status information",
    schema: {
      type: "object",
      properties: {
        task_id: { type: "string" },
        status: { type: "string", enum: ["Queued", "Processing", "Succeeded", "Failed"] },
        progress: { type: "number", minimum: 0, maximum: 100 },
        message: { type: "string" },
        estimated_completion: { type: "string", format: "date-time" }
      },
    },
  })
  @ApiResponse({ status: 404, description: "Task not found" })
  async getTaskStatus(@Param('taskId') taskId: string): Promise<CadTaskStatus> {
    return this.cadService.getTaskStatus(taskId);
  }
}
