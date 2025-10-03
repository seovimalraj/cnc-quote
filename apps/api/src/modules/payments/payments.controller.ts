import { Body, Controller, Post, Param, Req, UsePipes, ValidationPipe } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CreateCheckoutSessionDto, CapturePayPalOrderDto } from "./payments.dto";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";

@ApiTags("payments")
@Controller("payments")
@UsePipes(new ValidationPipe({ transform: true }))
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post("create-checkout-session")
  @ApiOperation({ summary: "Create a new PayPal checkout session" })
  @ApiBody({ type: CreateCheckoutSessionDto })
  async createCheckoutSession(
    @Req() req: any,
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
  ) {
    req.audit = {
      action: 'PAYMENT_METHOD_ADDED',
      resourceType: 'payment',
      resourceId: createCheckoutSessionDto.quoteId,
      before: null,
    };
    const result = await this.paymentsService.createCheckoutSession(createCheckoutSessionDto.quoteId);
    req.audit.after = { quoteId: createCheckoutSessionDto.quoteId };
    return result;
  }

  @Post("paypal/capture/:orderId")
  @ApiOperation({ summary: "Capture a PayPal payment" })
  async capturePayPalOrder(@Req() req: any, @Param() { orderId }: CapturePayPalOrderDto) {
    req.audit = {
      action: 'INVOICE_ISSUED',
      resourceType: 'payment',
      resourceId: orderId,
      before: null,
    };
    const result = await this.paymentsService.capturePayPalOrder(orderId);
    req.audit.after = { orderId };
    return result;
  }
}
