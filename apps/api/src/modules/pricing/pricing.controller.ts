import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { JwtGuard } from '../../auth/jwt.guard';
import { OrgGuard } from '../../auth/org.guard';
import { ApiTags } from '@nestjs/swagger';
import type {
  CncPriceRequest,
  SheetMetalPriceRequest,
  InjectionMoldingPriceRequest,
  PriceResponse
} from '@cnc-quote/shared';

@ApiTags('pricing')
@Controller('price')
@UseGuards(JwtGuard, OrgGuard)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post()
  async calculatePrice(
    @Body() request: CncPriceRequest | SheetMetalPriceRequest | InjectionMoldingPriceRequest
  ): Promise<PriceResponse> {
    switch (request.process_type) {
      case 'milling':
      case 'turning':
        return this.pricingService.calculateCncPrice(request);
      
      case 'laser':
      case 'punch':
      case 'waterjet':
        return this.pricingService.calculateSheetMetalPrice(request);
      
      case 'injection_molding':
        return this.pricingService.calculateInjectionMoldingPrice(request);
      
      default:
        throw new Error(`Unsupported process type: ${request.process_type}`);
    }
  }
}
