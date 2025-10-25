import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

import { Roles } from "../../core/auth/roles.decorator";
import { RolesGuard } from "../../core/auth/roles.guard";
import { ReqUser } from "../../core/auth/req-user.decorator";
import { AdminContentService, ActorContext } from './admin-content.service';
import { UpsertDocumentDto, UpsertPageDto } from './admin-content.dto';

@Controller('admin/content')
@UseGuards(AuthGuard, RolesGuard)
export class AdminContentController {
  constructor(private readonly adminContentService: AdminContentService) {}

  @Get('pages')
  @Roles('admin', 'org_admin')
  async listPages() {
    return this.adminContentService.listPages();
  }

  @Post('pages')
  @Roles('admin', 'org_admin')
  async createPage(
    @Body() body: UpsertPageDto,
    @ReqUser() user: any,
    @Req() request: Request,
  ) {
    const result = await this.adminContentService.upsertPage(body, this.buildActor(user, request));
    return { data: result };
  }

  @Put('pages/:id')
  @Roles('admin', 'org_admin')
  async updatePage(
    @Param('id') pageId: string,
    @Body() body: UpsertPageDto,
    @ReqUser() user: any,
    @Req() request: Request,
  ) {
    const payload = { ...body, id: pageId };
    const result = await this.adminContentService.upsertPage(payload, this.buildActor(user, request));
    return { data: result };
  }

  @Get('documents')
  @Roles('admin', 'org_admin')
  async listDocuments() {
    return this.adminContentService.listDocuments();
  }

  @Post('documents')
  @Roles('admin', 'org_admin')
  async createDocument(
    @Body() body: UpsertDocumentDto,
    @ReqUser() user: any,
    @Req() request: Request,
  ) {
    const result = await this.adminContentService.upsertDocument(body, this.buildActor(user, request));
    return { data: result };
  }

  @Put('documents/:id')
  @Roles('admin', 'org_admin')
  async updateDocument(
    @Param('id') documentId: string,
    @Body() body: UpsertDocumentDto,
    @ReqUser() user: any,
    @Req() request: Request,
  ) {
    const payload = { ...body, id: documentId };
    const result = await this.adminContentService.upsertDocument(payload, this.buildActor(user, request));
    return { data: result };
  }

  private buildActor(user: any, request: Request): ActorContext {
    const forwarded = request.headers['x-forwarded-for'];
    let ip: string | null = null;
    if (Array.isArray(forwarded)) {
      ip = forwarded[0] ?? null;
    } else if (typeof forwarded === 'string') {
      ip = forwarded.split(',')[0]?.trim() ?? null;
    }

    return {
      userId: user?.userId ?? user?.sub ?? null,
      role: user?.role ?? null,
      email: user?.email ?? null,
      ip: ip ?? request.ip ?? null,
    };
  }
}
