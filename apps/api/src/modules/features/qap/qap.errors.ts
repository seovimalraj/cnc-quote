import { HttpException, HttpStatus } from "@nestjs/common";

export class QapTemplateNotFoundException extends HttpException {
  constructor(templateId: string) {
    super(`QAP template not found: ${templateId}`, HttpStatus.NOT_FOUND);
  }
}

export class QapDocumentNotFoundException extends HttpException {
  constructor(documentId: string) {
    super(`QAP document not found: ${documentId}`, HttpStatus.NOT_FOUND);
  }
}

export class QapGenerationFailedException extends HttpException {
  constructor(message: string) {
    super(`Failed to generate QAP document: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class QapUploadFailedException extends HttpException {
  constructor(message: string) {
    super(`Failed to upload QAP document: ${message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

export class QapInvalidDataException extends HttpException {
  constructor(message: string) {
    super(`Invalid QAP data: ${message}`, HttpStatus.BAD_REQUEST);
  }
}
