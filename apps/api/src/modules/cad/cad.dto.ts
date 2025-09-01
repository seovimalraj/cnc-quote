import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty } from "class-validator";

export class QueueAnalysisDto {
  @ApiProperty({
    description: "The ID of the file to analyze",
    example: "file_123",
  })
  @IsString()
  @IsNotEmpty()
  fileId: string;
}

export class GetAnalysisResultDto {
  @ApiProperty({
    description: "The ID of the analysis task",
    example: "task_123",
  })
  @IsString()
  @IsNotEmpty()
  taskId: string;
}

export class GetPreviewDto {
  @ApiProperty({
    description: "The ID of the file to generate preview for",
    example: "file_123",
  })
  @IsString()
  @IsNotEmpty()
  fileId: string;
}

export class TaskResponseDto {
  @ApiProperty({
    description: "The ID of the queued task",
    example: "task_123",
  })
  taskId: string;
}
