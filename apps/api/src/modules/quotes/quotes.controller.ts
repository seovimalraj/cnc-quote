import { Controller, Get, Post, Put, Patch, Body, Param, UseGuards, Query, Res, Req } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../auth/jwt.guard";
import { OrgGuard } from "../auth/org.guard";
import { QuotesService } from "./quotes.service";
import { UpdateQuoteDto } from "./quotes.dto";
import { QuotePreviewService } from './quote-preview.service';
import { QuoteRevisionsService } from './quote-revisions.service';
import { MultiPartQuotePreviewRequest, ContractsV1 } from '@cnc-quote/shared';
import { PoliciesGuard } from "../auth/policies.guard";
import { Policies } from "../auth/policies.decorator";

@Controller("api/quotes")
@UseGuards(JwtAuthGuard, OrgGuard, PoliciesGuard)
export class QuotesController {
  constructor(
    private readonly quotesService: QuotesService,
    private readonly previewService: QuotePreviewService,
    private readonly revisionsService: QuoteRevisionsService,
  ) {}

  // Multi-part quote initialization
  @Post()
  @Policies({ action: 'create', resource: 'quotes' })
  async createMultiPartQuote(
    @Req() req: any,
    @Body() body: { parts: any[]; currency?: string; customer_id?: string },
  ) {
    const orgId = req.rbac?.orgId;
    const payload = { ...body, org_id: orgId } as Parameters<QuotesService['createMultiPartQuote']>[0];
    req.audit = {
      action: 'QUOTE_CREATED',
      resourceType: 'quote',
      resourceId: null,
      before: null,
    };
    const result = await this.quotesService.createMultiPartQuote(payload, orgId, req.user?.sub);
    req.audit.resourceId = result.id;
    req.audit.after = result;
    return result;
  }

  // Multi-part quote pricing preview (stateless, no DB writes)
  @Post('preview-multipart')
  @Policies({ action: 'view', resource: 'quotes' })
  async previewMultiPart(@Req() req: any, @Body() body: MultiPartQuotePreviewRequest) {
    return this.previewService.preview({ ...body, org_id: req.rbac?.orgId } as MultiPartQuotePreviewRequest & { org_id?: string | null });
  }

  // Batch add parts to existing quote (subsequent uploads)
  @Post(":id/parts")
  @Policies({ action: 'update', resource: 'quotes' })
  async addParts(@Req() req: any, @Param('id') id: string, @Body() body: { parts: any[] }) {
    req.audit = {
      action: 'QUOTE_REPRICED',
      resourceType: 'quote',
      resourceId: id,
      before: null,
    };
    const result = await this.quotesService.addPartsToQuote(id, req.rbac?.orgId, body.parts || []);
    req.audit.after = { parts_added: body.parts?.length ?? 0 };
    return result;
  }

  @Post("from-dfm")
  async createQuoteFromDfm(@Body() data: { dfm_request_id: string }) {
    return this.quotesService.createQuoteFromDfm(data.dfm_request_id);
  }

  @Get(":id")
  @Policies({ action: 'view', resource: 'quotes' })
  async getQuote(@Req() req: any, @Param("id") id: string, @Query('view') view?: string) {
    if (view === 'vnext') {
      return this.quotesService.getQuoteSummaryVNext(id, req.rbac?.orgId);
    }

    return this.quotesService.getQuote(id, req.rbac?.orgId);
  }

  @Get(":id/summary")
  @Policies({ action: 'view', resource: 'quotes' })
  async getQuoteSummary(@Req() req: any, @Param("id") id: string) {
    return this.quotesService.getQuoteSummaryV1(id, req.rbac?.orgId);
  }

  @Put(":id")
  @Policies({ action: 'update', resource: 'quotes' })
  async updateQuote(@Req() req: any, @Param("id") id: string, @Body() data: UpdateQuoteDto) {
    req.audit = {
      action: 'QUOTE_REPRICED',
      resourceType: 'quote',
      resourceId: id,
      before: null,
    };
    const result = await this.quotesService.updateQuote(id, data, req.rbac?.orgId);
    req.audit.after = { status: result.status, total_amount: result.total_amount };
    return result;
  }

  @Patch(":id/parts/:partId/config")
  @Policies({ action: 'update', resource: 'quotes' })
  async patchPartConfig(@Req() req: any, @Param("id") id: string, @Param('partId') partId: string, @Body() data: any) {
    // Fetch existing item config and shallow merge
    const quote = await this.quotesService.getQuote(id);
    const item = (quote.items || []).find((it: any) => it.id === partId);
    if (!item) return { error: 'Part not found' };
    const existing = item.config_json || {};
    const merged = { ...existing, ...data, audit: { ...(existing.audit||{}), updated_at: new Date().toISOString() } };
    await this.quotesService['supabase'].client
      .from('quote_items')
      .update({ config_json: merged })
      .eq('id', partId)
      .eq('quote_id', id);
    return { success: true };
  }

  @Get(":id/pdf")
  @Policies({ action: 'view', resource: 'quotes' })
  async downloadPdf(@Req() req: any, @Param("id") id: string, @Res() res: Response) {
    const pdf = await this.quotesService.generatePdf(id, req.rbac?.orgId);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quote-${id}.pdf"`,
    });

    res.send(pdf);
  }

  @Post(":id/send")
  @Policies({ action: 'update', resource: 'quotes' })
  async sendQuote(@Req() req: any, @Param("id") id: string, @Body("email") email: string) {
    await this.quotesService.sendQuote(id, email, req.rbac?.orgId);
    return { success: true };
  }

  @Get(":id/accept")
  async acceptQuote(@Param("id") id: string, @Query("token") _token: string) {
    // Token validation placeholder (replace with secure verification layer)
    await this.quotesService.updateQuote(id, {
      status: "accepted",
      acceptedAt: new Date(),
    });
    return { success: true };
  }

  @Get(":id/reject")
  async rejectQuote(@Param("id") id: string, @Query("token") _token: string) {
    // Token validation placeholder (replace with secure verification layer)
    await this.quotesService.updateQuote(id, {
      status: "rejected",
      rejectedAt: new Date(),
    });
    return { success: true };
  }

  // --- Lifecycle Transition Endpoints ---
  @Post(":id/status")
  @Policies({ action: 'update', resource: 'quotes' })
  async transition(@Req() req: any, @Param('id') id: string, @Body() body: { status: string }) {
    const before = await this.quotesService.getQuoteSummaryV1(id, req.rbac?.orgId);
    req.audit = {
      action: 'QUOTE_STATUS_CHANGED',
      resourceType: 'quote',
      resourceId: id,
      before: { status: before.status },
    };
    const updated = await this.quotesService.transitionQuoteStatus(id, body.status as any, req.rbac?.orgId);
    req.audit.after = { status: updated.status };
    return { success: true, quote: updated };
  }

  @Post(":id/to-processing")
  @Policies({ action: 'update', resource: 'quotes' })
  async toProcessing(@Req() req: any, @Param('id') id: string) {
    const before = await this.quotesService.getQuoteSummaryV1(id, req.rbac?.orgId);
    req.audit = {
      action: 'QUOTE_STATUS_CHANGED',
      resourceType: 'quote',
      resourceId: id,
      before: { status: before.status },
    };
    const updated = await this.quotesService.transitionQuoteStatus(id, 'processing', req.rbac?.orgId);
    req.audit.after = { status: updated.status };
    return { success: true, quote: updated };
  }

  @Post(":id/to-ready")
  @Policies({ action: 'update', resource: 'quotes' })
  async toReady(@Req() req: any, @Param('id') id: string) {
    const before = await this.quotesService.getQuoteSummaryV1(id, req.rbac?.orgId);
    req.audit = {
      action: 'QUOTE_STATUS_CHANGED',
      resourceType: 'quote',
      resourceId: id,
      before: { status: before.status },
    };
    const updated = await this.quotesService.transitionQuoteStatus(id, 'ready', req.rbac?.orgId);
    req.audit.after = { status: updated.status };
    return { success: true, quote: updated };
  }

  @Post(":id/to-sent")
  @Policies({ action: 'update', resource: 'quotes' })
  async toSent(@Req() req: any, @Param('id') id: string) {
    const before = await this.quotesService.getQuoteSummaryV1(id, req.rbac?.orgId);
    req.audit = {
      action: 'QUOTE_STATUS_CHANGED',
      resourceType: 'quote',
      resourceId: id,
      before: { status: before.status },
    };
    const updated = await this.quotesService.transitionQuoteStatus(id, 'sent', req.rbac?.orgId);
    req.audit.after = { status: updated.status };
    return { success: true, quote: updated };
  }

  @Post(":id/to-accepted")
  @Policies({ action: 'update', resource: 'quotes' })
  async toAccepted(@Req() req: any, @Param('id') id: string) {
    const before = await this.quotesService.getQuoteSummaryV1(id, req.rbac?.orgId);
    req.audit = {
      action: 'QUOTE_STATUS_CHANGED',
      resourceType: 'quote',
      resourceId: id,
      before: { status: before.status },
    };
    const updated = await this.quotesService.transitionQuoteStatus(id, 'accepted', req.rbac?.orgId);
    req.audit.after = { status: updated.status };
    return { success: true, quote: updated };
  }

  // -------- Quote Revisions (Phase 2) --------
  @Get(':id/revisions')
  @Policies({ action: 'view', resource: 'quotes' })
  async listRevisions(@Req() req: any, @Param('id') id: string) {
    const revisions = await this.revisionsService.fetchRevisions(id);
    return { revisions };
  }

  @Post(':id/revisions')
  @Policies({ action: 'update', resource: 'quotes' })
  async createRevision(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { reason?: string; diff_summary?: ContractsV1.QuoteRevisionSummaryV1['diff_summary'] }
  ) {
    // If diff not supplied, attempt to compute a structural diff placeholder (future: compare last applied vs current quote summary)
    const diff = body.diff_summary || [];
    const rev = await this.revisionsService.createDraftRevision({ quote_id: id, reason: body.reason, diff_summary: diff });
    return { revision: rev };
  }

  @Post(':id/revisions/create-from-state')
  @Policies({ action: 'update', resource: 'quotes' })
  async createRevisionFromState(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { current_quote_state: any; reason?: string }
  ) {
    const revision = await this.revisionsService.createRevisionFromQuoteState({
      quote_id: id,
      current_quote_state: body.current_quote_state,
      reason: body.reason,
    });
    return { revision };
  }
}
