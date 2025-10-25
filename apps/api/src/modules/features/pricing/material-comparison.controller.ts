import { Controller, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from "../../core/auth/jwt.guard";
import { MaterialComparisonService, MaterialComparisonRequest, MaterialComparisonResponse } from './material-comparison.service';

@Controller('api/pricing/material-comparison')
@UseGuards(JwtAuthGuard)
export class MaterialComparisonController {
  private readonly logger = new Logger(MaterialComparisonController.name);

  constructor(private readonly materialComparisonService: MaterialComparisonService) {}

  @Post()
  async compareMaterials(
    @Body() request: MaterialComparisonRequest
  ): Promise<MaterialComparisonResponse> {
    this.logger.log(`Material comparison request for material ${request.materialId}`);
    
    const startTime = Date.now();
    
    try {
      const comparison = await this.materialComparisonService.compareMaterials(request);
      
      const duration = Date.now() - startTime;
      this.logger.log(`Material comparison completed in ${duration}ms`);
      
      return comparison;
    } catch (error) {
      this.logger.error(`Material comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
