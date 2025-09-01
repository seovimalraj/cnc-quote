import { HttpException } from "@nestjs/common";

export type ErrorResponse =
  | string
  | HttpException
  | Error
  | {
      message?: string;
      error?: string;
      statusCode?: number;
    };
