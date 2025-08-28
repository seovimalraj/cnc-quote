import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Machine } from '@cnc-quote/shared';
import { MachineService } from './machine.service';

@Controller('machines')
@ApiTags('machines')
export class MachineController {
  constructor(private readonly machineService: MachineService) {}

  @Get()
  @ApiOperation({ summary: 'Get all machines for current org' })
  async findAll(): Promise<Machine[]> {
    return this.machineService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a machine by id' })
  async findOne(@Param('id') id: string): Promise<Machine> {
    return this.machineService.findOne(id);
  }
}
