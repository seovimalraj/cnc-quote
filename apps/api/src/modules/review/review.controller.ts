import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { ReviewService } from "./review.service";

@ApiTags("Review Management")
@Controller("admin/review")
@UseGuards(JwtAuthGuard, OrgGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  @ApiQuery({ name: "lane", required: false })
  @ApiQuery({ name: "priority", required: false, type: [String] })
  @ApiQuery({ name: "assignee", required: false, type: [String] })
  @ApiQuery({ name: "hasDFM", required: false })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "minValue", required: false })
  @ApiQuery({ name: "maxValue", required: false })
  @ApiQuery({ name: "sort", required: false })
  @ApiQuery({ name: "order", required: false })
  @ApiQuery({ name: "limit", required: false })
  @ApiQuery({ name: "cursor", required: false })
  async getReviewQueue(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Query() query: Record<string, any>) {
    const orgId = this.resolveOrgId(req);
    if (!orgId) {
      throw new BadRequestException("Missing organization context");
    }

    const filters = this.reviewService.parseFilters(query);
    res.setHeader("Cache-Control", "private, max-age=15");
    res.setHeader("Content-Security-Policy", "default-src 'self'");
    return this.reviewService.getReviewQueue(orgId, filters);
  }

  @Get('counts')
  async getReviewCounts(@Req() req: Request) {
    const orgId = this.resolveOrgId(req);
    if (!orgId) {
      throw new BadRequestException("Missing organization context");
    }

    return this.reviewService.getReviewCounts(orgId);
  }

  @Put(':ticketId/assign')
  @ApiParam({ name: 'ticketId', description: 'Review ticket ID' })
  async assignReviewTicket(
    @Req() req: Request,
    @Param('ticketId') ticketId: string,
    @Body() body: { user_id: string }
  ) {
    const orgId = this.resolveOrgId(req);
    if (!orgId) {
      throw new BadRequestException("Missing organization context");
    }

    return this.reviewService.assignReviewTicket(orgId, ticketId, body.user_id);
  }

  @Put(':ticketId/move')
  @ApiParam({ name: 'ticketId', description: 'Review ticket ID' })
  async moveReviewTicket(
    @Req() req: Request,
    @Param('ticketId') ticketId: string,
    @Body() body: { lane: string }
  ) {
    const orgId = this.resolveOrgId(req);
    if (!orgId) {
      throw new BadRequestException("Missing organization context");
    }

    return this.reviewService.moveReviewTicket(orgId, ticketId, body.lane);
  }

  @Get(':quoteId')
  @ApiParam({ name: 'quoteId', description: 'Quote ID' })
  async getReviewDetail(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Param('quoteId') quoteId: string
  ) {
    const orgId = this.resolveOrgId(req);
    if (!orgId) {
      throw new BadRequestException("Missing organization context");
    }

    res.setHeader("Cache-Control", "private, max-age=15");
    res.setHeader("Content-Security-Policy", "default-src 'self'");
    return this.reviewService.getReviewDetail(orgId, quoteId);
  }

  @Post(':quoteId/simulate')
  @ApiParam({ name: 'quoteId', description: 'Quote ID' })
  async simulatePriceOverride(
    @Param('quoteId') quoteId: string,
    @Body() overrides: any
  ) {
    return this.reviewService.simulatePriceOverride(quoteId, overrides);
  }

  @Put(':quoteId/override')
  @ApiParam({ name: 'quoteId', description: 'Quote ID' })
  async applyPriceOverride(
    @Param('quoteId') quoteId: string,
    @Body() body: { overrides: any; reason: any }
  ) {
    return this.reviewService.applyPriceOverride(quoteId, body.overrides, body.reason);
  }

  @Put(':quoteId/dfm/:findingId/ack')
  @ApiParam({ name: 'quoteId', description: 'Quote ID' })
  @ApiParam({ name: 'findingId', description: 'DFM finding ID' })
  async acknowledgeDfmFinding(
    @Param('quoteId') quoteId: string,
    @Param('findingId') findingId: string,
    @Body() body: { note?: string }
  ) {
    return this.reviewService.acknowledgeDfmFinding(quoteId, findingId, body.note);
  }

  @Post(':quoteId/dfm/:findingId/annotate')
  @ApiParam({ name: 'quoteId', description: 'Quote ID' })
  @ApiParam({ name: 'findingId', description: 'DFM finding ID' })
  async annotateDfmFinding(
    @Param('quoteId') quoteId: string,
    @Param('findingId') findingId: string,
    @Body() annotation: any
  ) {
    return this.reviewService.annotateDfmFinding(quoteId, findingId, annotation);
  }

  @Post(':quoteId/request-changes')
  @ApiParam({ name: 'quoteId', description: 'Quote ID' })
  async requestChanges(
    @Param('quoteId') quoteId: string,
    @Body() request: any
  ) {
    return this.reviewService.requestChanges(quoteId, request);
  }

  @Post(':quoteId/notes')
  @ApiParam({ name: 'quoteId', description: 'Quote ID' })
  async addNote(
    @Param('quoteId') quoteId: string,
    @Body() note: any
  ) {
    return this.reviewService.addNote(quoteId, note);
  }

  @Get(':quoteId/activity')
  @ApiParam({ name: 'quoteId', description: 'Quote ID' })
  async getActivity(@Req() req: Request, @Param('quoteId') quoteId: string) {
    const orgId = this.resolveOrgId(req);
    if (!orgId) {
      throw new BadRequestException("Missing organization context");
    }

    const workspace = await this.reviewService.getReviewWorkspace(orgId, quoteId);
    return workspace.activity;
  }

  @Get('export.csv')
  async exportReviewQueue(@Req() req: Request, @Query() query: Record<string, any>) {
    const orgId = this.resolveOrgId(req);
    if (!orgId) {
      throw new BadRequestException("Missing organization context");
    }

  const parsed = this.reviewService.parseFilters(query);
  const requestedLimit = typeof query?.limit === 'string' ? Number.parseInt(query.limit, 10) : Number(query?.limit ?? 50000);
  const effectiveLimit = Number.isFinite(requestedLimit) ? Math.min(requestedLimit, 50000) : 50000;
  const filters = { ...parsed, limit: effectiveLimit };

  const { data } = await this.reviewService.getReviewQueue(orgId, filters);

    if (data.length > 50000) {
      throw new BadRequestException("Too many rows to export (max 50k). Narrow your filters.");
    }

    const header = [
      "Ticket ID",
      "Quote Number",
      "Customer Name",
      "Company",
      "Created At",
      "Submitted By",
      "Lane",
      "Status Reason",
      "Total Items",
      "Total Value",
      "Currency",
      "DFM Findings",
      "Priority",
      "Assignee",
      "Last Action At",
    ].join(',');

    const rows = data.map((row) =>
      [
        row.id,
        row.quoteNo,
        this.escape(row.customerName),
        this.escape(row.company),
        row.createdAt,
        this.escape(row.submittedBy),
        row.lane,
        this.escape(row.statusReason ?? ''),
        row.totalItems,
        row.totalValue,
        row.currency,
        row.dfmFindingCount,
        row.priority,
        this.escape(row.assignee ?? ''),
        row.lastActionAt ?? '',
      ].join(','),
    );

    return {
      content: [header, ...rows].join('\n'),
      filename: `review-queue-${new Date().toISOString().slice(0, 10)}.csv`,
    };
  }

  private resolveOrgId(req: Request): string | undefined {
    const headerOrg = (req.headers['x-org-id'] || req.headers['X-Org-Id']) as string | undefined;
    if (headerOrg) {
      return headerOrg;
    }
    return req.user?.org_id || req.user?.default_org_id || req.user?.last_org_id || undefined;
  }

  private escape(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
