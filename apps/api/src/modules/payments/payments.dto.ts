import { IsString } from "class-validator";

export class CreateCheckoutSessionDto {
  @IsString()
  quoteId: string;
}

export class CapturePayPalOrderDto {
  @IsString()
  orderId: string;
}

export class WebhookDto {
  @IsString()
  signature: string;
}
