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
import { QapTemplatesService } from './qap-templates.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgGuard } from '../../auth/org.guard';
import { ReqUser } from '../../auth/req-user.decorator';
import { QAPTemplate } from '../../../../../packages/shared/src/types/schema';

@Controller('admin/qap-templates')
@UseGuards(AuthGuard, OrgGuard)
export class QapTemplatesController {
  constructor(private readonly qapTemplatesService: QapTemplatesService) {}

  @Get()
  async getQapTemplates(
    @Query() filters: any,
    @ReqUser() user: any,
  ) {
    try {
      const templates = await this.qapTemplatesService.getQapTemplates(user.org_id, filters);
      return { data: templates };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch QAP templates', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getQapTemplate(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const template = await this.qapTemplatesService.getQapTemplate(id, user.org_id);
      if (!template) {
        throw new HttpException('QAP template not found', HttpStatus.NOT_FOUND);
      }
      return { data: template };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { error: 'Failed to fetch QAP template', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createQapTemplate(
    @Body() templateData: Partial<QAPTemplate>,
    @ReqUser() user: any,
  ) {
    try {
      const template = await this.qapTemplatesService.createQapTemplate(templateData, user.org_id, user.id);
      return { data: template };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to create QAP template', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateQapTemplate(
    @Param('id') id: string,
    @Body() updates: Partial<QAPTemplate>,
    @ReqUser() user: any,
  ) {
    try {
      const template = await this.qapTemplatesService.updateQapTemplate(id, updates, user.id);
      return { data: template };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to update QAP template', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/publish')
  async publishQapTemplate(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const template = await this.qapTemplatesService.publishQapTemplate(id, user.id);
      return { data: template };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to publish QAP template', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/toggle-publish')
  async togglePublishQapTemplate(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const template = await this.qapTemplatesService.togglePublishQapTemplate(id, user.id);
      return { data: template };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to toggle publish status', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/duplicate')
  async duplicateQapTemplate(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const template = await this.qapTemplatesService.duplicateQapTemplate(id, user.org_id, user.id);
      return { data: template };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to duplicate QAP template', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/preview')
  async previewQapTemplate(
    @Param('id') id: string,
    @Body() body: { variables?: Record<string, any> },
  ) {
    try {
      const preview = await this.qapTemplatesService.previewQapTemplate(id, body.variables || {});
      return { data: preview };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to generate preview', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
