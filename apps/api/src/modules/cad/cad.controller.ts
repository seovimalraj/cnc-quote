import { Controller, Post, Body, UseGuards, Get, Param } from "@nestjs/common";
import { CadService } from "./cad.service";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { User } from "../../auth/user.decorator";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { QueueAnalysisDto, GetAnalysisResultDto, GetPreviewDto, TaskResponseDto } from "./cad.dto";
import { CadAnalysisResult } from "./cad.types";

@ApiTags("CAD")
@Controller("cad")
@UseGuards(JwtAuthGuard, OrgGuard)
@ApiBearerAuth()
export class CadController {
  constructor(private readonly cadService: CadService) {}

  @Post("analyze")
  @ApiOperation({ summary: "Queue CAD file analysis" })
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
  @ApiOperation({ summary: "Get CAD analysis result" })
  @ApiResponse({
    status: 200,
    description: "CAD processing result",
    schema: {
      type: "object",
      properties: { taskId: { type: "string" }, status: { type: "string" } },
    },
  })
  @ApiResponse({ status: 404, description: "Task not found" })
  async getAnalysisResult(@Param() dto: GetAnalysisResultDto): Promise<CadAnalysisResult> {
    return this.cadService.getAnalysisResult(dto.taskId);
  }

  @Post("preview/:fileId")
  @ApiOperation({ summary: "Queue CAD file preview generation" })
  @ApiResponse({
    status: 201,
    description: "Preview generation task queued successfully",
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid input or file not ready" })
  @ApiResponse({ status: 404, description: "File not found" })
  async getPreview(@Param() dto: GetPreviewDto, @User("sub") userId: string): Promise<TaskResponseDto> {
    return this.cadService.getPreview(dto.fileId, userId);
  }
}
