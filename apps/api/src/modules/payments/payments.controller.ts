import { Body, Controller, Headers, Post, RawBodyRequest, Req, Param, UsePipes, ValidationPipe } from "@nestjs/common";
import { Request } from "express";
import { PaymentsService } from "./payments.service";
import { CreateCheckoutSessionDto, CapturePayPalOrderDto } from "./payments.dto";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";

@ApiTags("payments")
@Controller("payments")
@UsePipes(new ValidationPipe({ transform: true }))
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("create-checkout-session")
  @ApiOperation({ summary: "Create a new payment checkout session" })
  @ApiBody({ type: CreateCheckoutSessionDto })
  async createCheckoutSession(@Body() createCheckoutSessionDto: CreateCheckoutSessionDto) {
    return this.paymentsService.createCheckoutSession(
      createCheckoutSessionDto.quoteId,
      createCheckoutSessionDto.provider,
    );
  }

  @Post("paypal/capture/:orderId")
  @ApiOperation({ summary: "Capture a PayPal payment" })
  async capturePayPalOrder(@Param() { orderId }: CapturePayPalOrderDto) {
    return this.paymentsService.capturePayPalOrder(orderId);
  }

  @Post("webhook")
  @ApiOperation({ summary: "Handle Stripe webhook events" })
  async handleWebhook(@Headers("stripe-signature") signature: string, @Req() request: RawBodyRequest<Request>) {
    return this.paymentsService.handleWebhook(signature, request.rawBody);
  }
}
