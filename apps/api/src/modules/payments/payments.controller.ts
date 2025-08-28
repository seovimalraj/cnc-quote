import {
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  Param,
} from '@nestjs/common';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  async createCheckoutSession(
    @Body('quoteId') quoteId: string,
    @Body('provider') provider?: 'stripe' | 'paypal',
  ) {
    return this.paymentsService.createCheckoutSession(quoteId, provider);
  }

  @Post('paypal/capture/:orderId')
  async capturePayPalOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.capturePayPalOrder(orderId);
  }

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    return this.paymentsService.handleWebhook(signature, request.rawBody);
  }
}
