import { HttpException, HttpStatus } from "@nestjs/common";

export class PaymentProviderError extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class PaymentCaptureError extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

export class QuoteNotFoundError extends HttpException {
  constructor(quoteId: string) {
    super(`Quote not found: ${quoteId}`, HttpStatus.NOT_FOUND);
  }
}
