import { IsString, IsOptional, IsEnum } from "class-validator";
import { PaymentProvider } from "./payments.types";

export class CreateCheckoutSessionDto {
  @IsString()
  quoteId: string;

  @IsOptional()
  @IsEnum(["stripe", "paypal"] as const)
  provider?: PaymentProvider;
}

export class CapturePayPalOrderDto {
  @IsString()
  orderId: string;
}

export class WebhookDto {
  @IsString()
  signature: string;
}
