import { Controller, Get, Post, Put, Query, Param, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiQuery, ApiParam } from "@nestjs/swagger";
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
  @ApiQuery({ name: 'lane', required: false })
  @ApiQuery({ name: 'filters', required: false })
  async getReviewQueue(
    @Query('lane') lane?: string,
    @Query('filters') filters?: string
  ) {
    const parsedFilters = filters ? JSON.parse(filters) : {};
    return this.reviewService.getReviewQueue({ lane, ...parsedFilters });
  }

  @Get('counts')
  async getReviewCounts() {
    return this.reviewService.getReviewCounts();
  }

  @Put(':ticketId/assign')
  @ApiParam({ name: 'ticketId', description: 'Review ticket ID' })
  async assignReviewTicket(
    @Param('ticketId') ticketId: string,
    @Body() body: { user_id: string }
  ) {
    return this.reviewService.assignReviewTicket(ticketId, body.user_id);
  }

  @Put(':ticketId/move')
  @ApiParam({ name: 'ticketId', description: 'Review ticket ID' })
  async moveReviewTicket(
    @Param('ticketId') ticketId: string,
    @Body() body: { lane: string }
  ) {
    return this.reviewService.moveReviewTicket(ticketId, body.lane);
  }

  @Get(':quoteId')
  @ApiParam({ name: 'quoteId', description: 'Quote ID' })
  async getReviewWorkspace(@Param('quoteId') quoteId: string) {
    return this.reviewService.getReviewWorkspace(quoteId);
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
  async getActivity(@Param('quoteId') quoteId: string) {
    const workspace = await this.reviewService.getReviewWorkspace(quoteId);
    return workspace.activity;
  }

  @Get('export.csv')
  async exportReviewQueue() {
    // Mock CSV export
    return {
      content: 'Quote ID,Organization,Value,Status,Assignee,Priority\nQ41-1742-8058,Acme Corp,$227.98,Needs Review,,High',
      filename: 'review-queue.csv'
    };
  }
}
