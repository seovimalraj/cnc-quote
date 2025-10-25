import { Controller, Post, Body, HttpException, HttpStatus, Ip } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  async createLead(
    @Body() createLeadDto: CreateLeadDto,
    @Ip() ip: string
  ) {
    try {
      const result = await this.leadsService.createLead(createLeadDto, ip);
      return result;
    } catch (error) {
      throw new HttpException(
        { error: error.message || 'Failed to create lead' },
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
