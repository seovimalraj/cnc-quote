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
  ParseUUIDPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrgGuard } from '../auth/org.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { User } from '../auth/user.decorator';
import { AdminDfmService } from './admin-dfm.service';
import {
  DfmOptionDto,
  CreateDfmOptionDto,
  UpdateDfmOptionDto,
  DfmRuleDto,
  CreateDfmRuleDto,
  UpdateDfmRuleDto,
  PublishDfmOptionsDto,
  DfmRequestSummaryDto,
  DfmRequestDetailDto,
  DfmInboxFiltersDto,
} from './admin-dfm.dto';

@ApiTags('Admin DFM')
@Controller('admin/dfm')
@UseGuards(JwtAuthGuard, OrgGuard, RolesGuard)
@Roles('admin')
@ApiBearerAuth()
export class AdminDfmController {
  constructor(private readonly adminDfmService: AdminDfmService) {}

  // ===== DFM OPTIONS MANAGEMENT =====

  @Get('options/tolerances')
  @ApiOperation({ summary: 'Get all tolerance options (admin view)' })
  @ApiResponse({ status: 200, description: 'List of tolerance options', type: [DfmOptionDto] })
  async getToleranceOptions(@User() user: any): Promise<DfmOptionDto[]> {
    return this.adminDfmService.getOptions('tolerances', user.org_id);
  }

  @Post('options/tolerances')
  @ApiOperation({ summary: 'Create tolerance option' })
  @ApiResponse({ status: 201, description: 'Tolerance option created', type: DfmOptionDto })
  async createToleranceOption(
    @Body() dto: CreateDfmOptionDto,
    @User() user: any,
  ): Promise<DfmOptionDto> {
    return this.adminDfmService.createOption('tolerances', dto, user);
  }

  @Put('options/tolerances/:id')
  @ApiOperation({ summary: 'Update tolerance option' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 200, description: 'Tolerance option updated', type: DfmOptionDto })
  async updateToleranceOption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDfmOptionDto,
    @User() user: any,
  ): Promise<DfmOptionDto> {
    return this.adminDfmService.updateOption('tolerances', id, dto, user);
  }

  @Delete('options/tolerances/:id')
  @ApiOperation({ summary: 'Delete tolerance option' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 204, description: 'Tolerance option deleted' })
  async deleteToleranceOption(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ): Promise<void> {
    return this.adminDfmService.deleteOption('tolerances', id, user);
  }

  @Get('options/finishes')
  @ApiOperation({ summary: 'Get all finish options (admin view)' })
  @ApiResponse({ status: 200, description: 'List of finish options', type: [DfmOptionDto] })
  async getFinishOptions(@User() user: any): Promise<DfmOptionDto[]> {
    return this.adminDfmService.getOptions('finishes', user.org_id);
  }

  @Post('options/finishes')
  @ApiOperation({ summary: 'Create finish option' })
  @ApiResponse({ status: 201, description: 'Finish option created', type: DfmOptionDto })
  async createFinishOption(
    @Body() dto: CreateDfmOptionDto,
    @User() user: any,
  ): Promise<DfmOptionDto> {
    return this.adminDfmService.createOption('finishes', dto, user);
  }

  @Put('options/finishes/:id')
  @ApiOperation({ summary: 'Update finish option' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 200, description: 'Finish option updated', type: DfmOptionDto })
  async updateFinishOption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDfmOptionDto,
    @User() user: any,
  ): Promise<DfmOptionDto> {
    return this.adminDfmService.updateOption('finishes', id, dto, user);
  }

  @Delete('options/finishes/:id')
  @ApiOperation({ summary: 'Delete finish option' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 204, description: 'Finish option deleted' })
  async deleteFinishOption(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ): Promise<void> {
    return this.adminDfmService.deleteOption('finishes', id, user);
  }

  @Get('options/industries')
  @ApiOperation({ summary: 'Get all industry options (admin view)' })
  @ApiResponse({ status: 200, description: 'List of industry options', type: [DfmOptionDto] })
  async getIndustryOptions(@User() user: any): Promise<DfmOptionDto[]> {
    return this.adminDfmService.getOptions('industries', user.org_id);
  }

  @Post('options/industries')
  @ApiOperation({ summary: 'Create industry option' })
  @ApiResponse({ status: 201, description: 'Industry option created', type: DfmOptionDto })
  async createIndustryOption(
    @Body() dto: CreateDfmOptionDto,
    @User() user: any,
  ): Promise<DfmOptionDto> {
    return this.adminDfmService.createOption('industries', dto, user);
  }

  @Put('options/industries/:id')
  @ApiOperation({ summary: 'Update industry option' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 200, description: 'Industry option updated', type: DfmOptionDto })
  async updateIndustryOption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDfmOptionDto,
    @User() user: any,
  ): Promise<DfmOptionDto> {
    return this.adminDfmService.updateOption('industries', id, dto, user);
  }

  @Delete('options/industries/:id')
  @ApiOperation({ summary: 'Delete industry option' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 204, description: 'Industry option deleted' })
  async deleteIndustryOption(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ): Promise<void> {
    return this.adminDfmService.deleteOption('industries', id, user);
  }

  @Get('options/certifications')
  @ApiOperation({ summary: 'Get all certification options (admin view)' })
  @ApiResponse({ status: 200, description: 'List of certification options', type: [DfmOptionDto] })
  async getCertificationOptions(@User() user: any): Promise<DfmOptionDto[]> {
    return this.adminDfmService.getOptions('certifications', user.org_id);
  }

  @Post('options/certifications')
  @ApiOperation({ summary: 'Create certification option' })
  @ApiResponse({ status: 201, description: 'Certification option created', type: DfmOptionDto })
  async createCertificationOption(
    @Body() dto: CreateDfmOptionDto,
    @User() user: any,
  ): Promise<DfmOptionDto> {
    return this.adminDfmService.createOption('certifications', dto, user);
  }

  @Put('options/certifications/:id')
  @ApiOperation({ summary: 'Update certification option' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 200, description: 'Certification option updated', type: DfmOptionDto })
  async updateCertificationOption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDfmOptionDto,
    @User() user: any,
  ): Promise<DfmOptionDto> {
    return this.adminDfmService.updateOption('certifications', id, dto, user);
  }

  @Delete('options/certifications/:id')
  @ApiOperation({ summary: 'Delete certification option' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 204, description: 'Certification option deleted' })
  async deleteCertificationOption(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ): Promise<void> {
    return this.adminDfmService.deleteOption('certifications', id, user);
  }

  @Get('options/criticality')
  @ApiOperation({ summary: 'Get all criticality options (admin view)' })
  @ApiResponse({ status: 200, description: 'List of criticality options', type: [DfmOptionDto] })
  async getCriticalityOptions(@User() user: any): Promise<DfmOptionDto[]> {
    return this.adminDfmService.getOptions('criticality', user.org_id);
  }

  @Post('options/criticality')
  @ApiOperation({ summary: 'Create criticality option' })
  @ApiResponse({ status: 201, description: 'Criticality option created', type: DfmOptionDto })
  async createCriticalityOption(
    @Body() dto: CreateDfmOptionDto,
    @User() user: any,
  ): Promise<DfmOptionDto> {
    return this.adminDfmService.createOption('criticality', dto, user);
  }

  @Put('options/criticality/:id')
  @ApiOperation({ summary: 'Update criticality option' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 200, description: 'Criticality option updated', type: DfmOptionDto })
  async updateCriticalityOption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDfmOptionDto,
    @User() user: any,
  ): Promise<DfmOptionDto> {
    return this.adminDfmService.updateOption('criticality', id, dto, user);
  }

  @Delete('options/criticality/:id')
  @ApiOperation({ summary: 'Delete criticality option' })
  @ApiParam({ name: 'id', description: 'Option ID' })
  @ApiResponse({ status: 204, description: 'Criticality option deleted' })
  async deleteCriticalityOption(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ): Promise<void> {
    return this.adminDfmService.deleteOption('criticality', id, user);
  }

  @Post('options/publish')
  @ApiOperation({ summary: 'Publish selected DFM options' })
  @ApiResponse({ status: 200, description: 'Options published successfully' })
  async publishOptions(
    @Body() dto: PublishDfmOptionsDto,
    @User() user: any,
  ): Promise<{ message: string; publishedCount: number }> {
    return this.adminDfmService.publishOptions(dto, user);
  }

  // ===== DFM RULES MANAGEMENT =====

  @Get('rules')
  @ApiOperation({ summary: 'Get all DFM rules (admin view)' })
  @ApiQuery({ name: 'processType', required: false, description: 'Filter by process type' })
  @ApiResponse({ status: 200, description: 'List of DFM rules', type: [DfmRuleDto] })
  async getDfmRules(
    @User() user: any,
    @Query('processType') processType?: string,
  ): Promise<DfmRuleDto[]> {
    return this.adminDfmService.getDfmRules(user.org_id, processType);
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create DFM rule' })
  @ApiResponse({ status: 201, description: 'DFM rule created', type: DfmRuleDto })
  async createDfmRule(
    @Body() dto: CreateDfmRuleDto,
    @User() user: any,
  ): Promise<DfmRuleDto> {
    return this.adminDfmService.createDfmRule(dto, user);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update DFM rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 200, description: 'DFM rule updated', type: DfmRuleDto })
  async updateDfmRule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDfmRuleDto,
    @User() user: any,
  ): Promise<DfmRuleDto> {
    return this.adminDfmService.updateDfmRule(id, dto, user);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: 'Delete DFM rule' })
  @ApiParam({ name: 'id', description: 'Rule ID' })
  @ApiResponse({ status: 204, description: 'DFM rule deleted' })
  async deleteDfmRule(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ): Promise<void> {
    return this.adminDfmService.deleteDfmRule(id, user);
  }

  @Post('rules/publish')
  @ApiOperation({ summary: 'Publish DFM rules' })
  @ApiResponse({ status: 200, description: 'Rules published successfully' })
  async publishRules(@User() user: any): Promise<{ message: string; publishedCount: number }> {
    return this.adminDfmService.publishRules(user);
  }

  @Get('rules/version')
  @ApiOperation({ summary: 'Get current published rules version' })
  @ApiResponse({ status: 200, description: 'Current rules version' })
  async getRulesVersion(@User() user: any): Promise<{ version: number; publishedAt: Date }> {
    return this.adminDfmService.getRulesVersion(user.org_id);
  }

  // ===== DFM INBOX MANAGEMENT =====

  @Get('requests')
  @ApiOperation({ summary: 'Get DFM requests inbox with filters' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by user ID' })
  @ApiQuery({ name: 'hasBlockers', required: false, description: 'Filter by presence of blockers' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date' })
  @ApiQuery({ name: 'limit', required: false, description: 'Limit results', type: Number })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination', type: Number })
  @ApiResponse({ status: 200, description: 'List of DFM requests', type: [DfmRequestSummaryDto] })
  async getDfmRequests(
    @Query() filters: DfmInboxFiltersDto,
    @User() user: any,
  ): Promise<{ requests: DfmRequestSummaryDto[]; total: number }> {
    return this.adminDfmService.getDfmRequests(user.org_id, filters);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get detailed DFM request information' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, description: 'DFM request details', type: DfmRequestDetailDto })
  async getDfmRequestDetail(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ): Promise<DfmRequestDetailDto> {
    return this.adminDfmService.getDfmRequestDetail(id, user.org_id);
  }

  @Post('requests/:id/convert-to-manual')
  @ApiOperation({ summary: 'Convert DFM request to manual review' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 200, description: 'Request converted to manual review' })
  async convertToManualReview(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ): Promise<{ message: string }> {
    return this.adminDfmService.convertToManualReview(id, user);
  }

  @Post('requests/:id/create-quote')
  @ApiOperation({ summary: 'Create quote from DFM request' })
  @ApiParam({ name: 'id', description: 'Request ID' })
  @ApiResponse({ status: 201, description: 'Quote created from DFM request' })
  async createQuoteFromDfm(
    @Param('id', ParseUUIDPipe) id: string,
    @User() user: any,
  ): Promise<{ quoteId: string; message: string }> {
    return this.adminDfmService.createQuoteFromDfm(id, user);
  }

  @Get('requests/export')
  @ApiOperation({ summary: 'Export DFM requests to CSV' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Filter from date' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Filter to date' })
  @ApiResponse({ status: 200, description: 'CSV export data' })
  async exportDfmRequests(
    @Query() filters: Partial<DfmInboxFiltersDto>,
    @User() user: any,
  ): Promise<string> {
    return this.adminDfmService.exportDfmRequests(user.org_id, filters);
  }
}
