import { BadRequestException, NotFoundException } from "@nestjs/common";

export class FileNotFoundError extends NotFoundException {
  constructor(fileId: string) {
    super(`File with ID ${fileId} not found`);
  }
}

export class FileNotReadyError extends BadRequestException {
  constructor(fileId: string, status: string) {
    super(`File ${fileId} is not ready for processing (status: ${status})`);
  }
}

export class CadServiceError extends BadRequestException {
  constructor(message: string) {
    super(`CAD service error: ${message}`);
  }
}

export class TaskNotFoundError extends NotFoundException {
  constructor(taskId: string) {
    super(`Task with ID ${taskId} not found`);
  }
}
