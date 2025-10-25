import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InspectionTemplatesService } from './inspection-templates.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgGuard } from "../../core/auth/org.guard";
import { ReqUser } from "../../core/auth/req-user.decorator";
import { InspectionTemplate } from "@cnc-quote/shared";

@Controller('admin/inspection/templates')
@UseGuards(AuthGuard, OrgGuard)
export class InspectionTemplatesController {
  constructor(private readonly inspectionTemplatesService: InspectionTemplatesService) {}

  @Get()
  async getInspectionTemplates(@Query() filters: any) {
    try {
      const templates = await this.inspectionTemplatesService.getInspectionTemplates(filters);
      return { data: templates };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch inspection templates', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getInspectionTemplate(@Param('id') id: string) {
    try {
      const template = await this.inspectionTemplatesService.getInspectionTemplate(id);
      if (!template) {
        throw new HttpException('Inspection template not found', HttpStatus.NOT_FOUND);
      }
      return { data: template };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { error: 'Failed to fetch inspection template', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createInspectionTemplate(
    @Body() templateData: Partial<InspectionTemplate>,
    @ReqUser() user: any,
  ) {
    try {
      const template = await this.inspectionTemplatesService.createInspectionTemplate(templateData, user.id);
      return { data: template };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to create inspection template', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateInspectionTemplate(
    @Param('id') id: string,
    @Body() updates: Partial<InspectionTemplate>,
    @ReqUser() user: any,
  ) {
    try {
      const template = await this.inspectionTemplatesService.updateInspectionTemplate(id, updates, user.id);
      return { data: template };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to update inspection template', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/archive')
  async archiveInspectionTemplate(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const template = await this.inspectionTemplatesService.archiveInspectionTemplate(id, user.id);
      return { data: template };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to archive inspection template', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/duplicate')
  async duplicateInspectionTemplate(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const template = await this.inspectionTemplatesService.duplicateInspectionTemplate(id, user.id);
      return { data: template };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to duplicate inspection template', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
