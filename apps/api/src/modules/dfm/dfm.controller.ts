import { Controller, Post, Body } from '@nestjs/common';
import { DfmService } from './dfm.service';
import {
  CncDfmParams,
  SheetMetalDfmParams,
  InjectionMoldingDfmParams,
  DfmValidationResponse,
} from '@cnc-quote/shared';

@Controller('api/validate')
export class DfmController {
  constructor(private readonly dfmService: DfmService) {}

  @Post('cnc')
  async validateCnc(@Body() params: CncDfmParams): Promise<DfmValidationResponse> {
    return this.dfmService.validateCnc(params);
  }

  @Post('sheet-metal')
  async validateSheetMetal(
    @Body() params: SheetMetalDfmParams,
  ): Promise<DfmValidationResponse> {
    return this.dfmService.validateSheetMetal(params);
  }

  @Post('injection-molding')
  async validateInjectionMolding(
    @Body() params: InjectionMoldingDfmParams,
  ): Promise<DfmValidationResponse> {
    return this.dfmService.validateInjectionMolding(params);
  }
}
