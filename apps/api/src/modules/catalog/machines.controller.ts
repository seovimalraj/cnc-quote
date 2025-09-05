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
import { MachinesService } from './machines.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgGuard } from '../../auth/org.guard';
import { ReqUser } from '../../auth/req-user.decorator';
import { Machine } from '../../../../../packages/shared/src/types/schema';

@Controller('admin/machines')
@UseGuards(AuthGuard, OrgGuard)
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  async getMachines(
    @Query() filters: any,
    @ReqUser() user: any,
  ) {
    try {
      const machines = await this.machinesService.getMachines(user.org_id, filters);
      return { data: machines };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch machines', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getMachine(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const machine = await this.machinesService.getMachine(id, user.org_id);
      if (!machine) {
        throw new HttpException('Machine not found', HttpStatus.NOT_FOUND);
      }
      return { data: machine };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        { error: 'Failed to fetch machine', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post()
  async createMachine(
    @Body() machineData: Partial<Machine>,
    @ReqUser() user: any,
  ) {
    try {
      const machine = await this.machinesService.createMachine(machineData, user.org_id, user.id);
      return { data: machine };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to create machine', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id')
  async updateMachine(
    @Param('id') id: string,
    @Body() updates: Partial<Machine>,
    @ReqUser() user: any,
  ) {
    try {
      const machine = await this.machinesService.updateMachine(id, updates, user.id);
      return { data: machine };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to update machine', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put(':id/archive')
  async archiveMachine(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const machine = await this.machinesService.archiveMachine(id, user.id);
      return { data: machine };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to archive machine', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/duplicate')
  async duplicateMachine(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const machine = await this.machinesService.duplicateMachine(id, user.org_id, user.id);
      return { data: machine };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to duplicate machine', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/recalc-quotes')
  async recalculateAffectedQuotes(
    @Param('id') id: string,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.machinesService.recalculateAffectedQuotes(id, user.id);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to trigger quote recalculation', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('bulk/rate-update')
  async bulkRateUpdate(
    @Body() body: { machineIds: string[]; rateUpdates: any },
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.machinesService.bulkRateUpdate(body.machineIds, body.rateUpdates, user.id);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to bulk update rates', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('export')
  async bulkExport(
    @Body() body: { machineIds: string[] },
    @ReqUser() user: any,
  ) {
    try {
      const machines = await this.machinesService.bulkExport(body.machineIds, user.id);
      return { data: machines };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to export machines', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
