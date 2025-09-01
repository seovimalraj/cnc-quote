import { Controller, Post, Body, UseGuards, Get, Param } from "@nestjs/common";
import { FilesService } from "./files.service";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { User } from "../../auth/user.decorator";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("files")
@Controller("files")
@UseGuards(JwtAuthGuard, OrgGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post("upload/init")
  async initiateUpload(
    @Body() body: { fileName: string; fileSize: number; organizationId: string },
    @User("sub") userId: string,
  ) {
    return this.filesService.initiateUpload(body, userId);
  }

  @Post("upload/complete")
  async completeUpload(@Body() body: { fileId: string }) {
    return this.filesService.completeUpload(body.fileId);
  }

  @Get(":id")
  async getFile(@Param("id") id: string) {
    return this.filesService.getFile(id);
  }

  @Get(":id/download")
  async getDownloadUrl(@Param("id") id: string) {
    return this.filesService.getDownloadUrl(id);
  }
}
