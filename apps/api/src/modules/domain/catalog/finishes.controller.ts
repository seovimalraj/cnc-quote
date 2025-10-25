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
import { FinishesService } from './finishes.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgGuard } from "../../core/auth/org.guard";
import { ReqUser } from "../../core/auth/req-user.decorator";
import { Finish } from "../../../../../packages/shared/src/types/schema";

@Controller('admin/finishes')
@UseGuards(AuthGuard, OrgGuard)
export class FinishesController {
  constructor(private readonly finishesService: FinishesService) {}

  @Get()
  async getFinishes(@Query() filters: any) {
    try {
      const finishes = await this.finishesService.getFinishes(filters);
      return { data: finishes };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch finishes', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getFinish(@Param('id') id: string) {
    try {
      const finish = await this.finishesService.getFinish(id);
      if (!finish) {
        throw new HttpException('Finish not found', HttpStatus.NOT_FOUND);
      }
      return { data: finish };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { error: 'Failed to fetch finish', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createFinish(
    @Body() finishData: Partial<Finish>,
    @ReqUser() user: any,
  ) {
    try {
      const finish = await this.finishesService.createFinish(finishData, user.id);
      return { data: finish };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to create finish', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateFinish(
    @Param('id') id: string,
    @Body() updates: Partial<Finish>,
    @ReqUser() user: any,
  ) {
    try {
      const finish = await this.finishesService.updateFinish(id, updates, user.id);
      return { data: finish };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to update finish', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/disable')
  async disableFinish(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const finish = await this.finishesService.disableFinish(id, user.id);
      return { data: finish };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to disable finish', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/duplicate')
  async duplicateFinish(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const finish = await this.finishesService.duplicateFinish(id, user.id);
      return { data: finish };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to duplicate finish', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id/compatible-materials')
  async getCompatibleMaterials(@Param('id') id: string) {
    try {
      const materials = await this.finishesService.getCompatibleMaterials(id);
      return { data: materials };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch compatible materials', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
