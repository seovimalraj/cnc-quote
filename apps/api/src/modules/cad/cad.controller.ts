import { Controller, Post, Body, UseGuards, Get, Param } from '@nestjs/common';
import { CadService } from './cad.service';
import { JwtGuard } from '../../auth/jwt.guard';
import { OrgGuard } from '../../auth/org.guard';
import { User } from '../../auth/user.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('cad')
@Controller('cad')
@UseGuards(JwtGuard, OrgGuard)
export class CadController {
  constructor(private readonly cadService: CadService) {}

  @Post('analyze')
  async analyzeFile(
    @Body() body: { fileId: string },
    @User('sub') userId: string,
  ) {
    return this.cadService.queueAnalysis(body.fileId, userId);
  }

  @Get('analysis/:taskId')
  async getAnalysisResult(
    @Param('taskId') taskId: string,
    @User('sub') userId: string,
  ) {
    return this.cadService.getAnalysisResult(taskId);
  }

  @Get('preview/:fileId')
  async getPreview(
    @Param('fileId') fileId: string,
    @User('sub') userId: string,
  ) {
    return this.cadService.getPreview(fileId, userId);
  }
}
