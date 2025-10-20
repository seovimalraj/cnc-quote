import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { differenceInHours, parseISO } from "date-fns";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import {
  AdminReviewItem,
  Lane,
  Priority,
  ReviewDetailResponse,
  ReviewListFilters,
  ReviewListResponse,
  listQuerySchema,
} from "./review.types";
import {
  AdminReviewSharedService,
  CustomerRow,
  ProfileRow,
  QuoteMetrics,
} from "./admin-review-shared.service";

type ManualReviewTaskRow = {
  id: string;
  quote_id: string;
  status: string;
  assignee_id: string | null;
  due_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  rule: {
    id: string;
    name: string | null;
    message: string | null;
    priority: number | null;
    sla_hours: number | null;
  } | null;
  quote: QuoteRow | null;
};

type QuoteRow = {
  id: string;
  org_id: string;
  customer_id: string | null;
  status: string | null;
  total_amount: number | null;
  currency: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  notes?: string | null;
};

type QuoteItemRow = {
  quote_id: string;
  total_price: number | null;
  dfm_json: any;
};

type QuoteItemDetailRow = QuoteItemRow & {
  id: string;
  config_json: any;
  created_at: string;
  updated_at: string;
};

type QuoteWithItemsRow = QuoteRow & {
  items?: QuoteItemDetailRow[];
};

type RawManualReviewTaskRow = Omit<ManualReviewTaskRow, "rule" | "quote"> & {
  rule?: ManualReviewTaskRow["rule"] | ManualReviewTaskRow["rule"][] | null;
  quote?: QuoteRow | QuoteRow[] | null;
};

@Injectable()
export class ReviewService extends AdminReviewSharedService {
  constructor(protected readonly supabase: SupabaseService) {
    super(supabase, ReviewService.name);
  }

  parseFilters(query: Record<string, string | string[] | undefined>): ReviewListFilters {
    const normalized = Object.fromEntries(
      Object.entries(query).map(([key, value]) => {
        if (Array.isArray(value)) {
          return [key, value.length === 1 ? value[0] : value];
        }
        return [key, value];
      }),
    );

    return listQuerySchema.parse(normalized);
  }

  async getReviewQueue(orgId: string, filters: ReviewListFilters): Promise<ReviewListResponse> {
    const tasks = await this.fetchTasks(orgId);
    if (tasks.length === 0) {
      return {
        data: [],
        meta: { limit: filters.limit, totalApprox: 0, nextCursor: null },
        stats: { totalRows: 0, totalValue: 0, conversionRate: 0 },
      };
    }

    const context = await this.buildContext(tasks);
    const items = tasks.map((task) =>
      this.buildAdminItem(task, context.metrics.get(task.quote_id) ?? this.defaultMetrics(), {
        customer: context.customers.get(task.quote?.customer_id ?? ""),
        submitter: context.profiles.get(task.quote?.created_by ?? ""),
        assignee: context.profiles.get(task.assignee_id ?? ""),
      }),
    );

    const filtered = this.applyFilters(items, filters);
    const sorted = this.applySort(filtered, filters.sort, filters.order);
    const paginated = this.applyPagination(sorted, filters.limit, filters.cursor);

    const totalValue = filtered.reduce((acc, item) => acc + (Number.isFinite(item.totalValue) ? item.totalValue : 0), 0);
    const approved = filtered.filter((item) => item.lane === "APPROVED").length;
    const conversionRate = filtered.length > 0 ? Number((approved / filtered.length).toFixed(4)) : 0;

    return {
      data: paginated.items,
      meta: {
        limit: filters.limit,
        nextCursor: paginated.nextCursor,
        totalApprox: filtered.length,
      },
      stats: {
        totalRows: filtered.length,
        totalValue: Number(totalValue.toFixed(2)),
        conversionRate,
      },
    };
  }

  async getReviewCounts(orgId: string) {
    const tasks = await this.fetchTasks(orgId);
    const context = await this.buildContext(tasks);
    const counts = { needs_review: 0, priced: 0, sent: 0, total: 0 };

    for (const task of tasks) {
      const item = this.buildAdminItem(task, context.metrics.get(task.quote_id) ?? this.defaultMetrics(), {
        customer: context.customers.get(task.quote?.customer_id ?? ""),
        submitter: context.profiles.get(task.quote?.created_by ?? ""),
        assignee: context.profiles.get(task.assignee_id ?? ""),
      });

      counts.total += 1;
      if (item.lane === "NEW") counts.needs_review += 1;
      if (item.lane === "IN_REVIEW") counts.priced += 1;
      if (item.lane === "APPROVED") counts.sent += 1;
    }

    return counts;
  }

  async assignReviewTicket(orgId: string, ticketId: string, userId: string) {
    if (!userId) {
      throw new BadRequestException("user_id is required");
    }

    const task = await this.findTaskForOrg(ticketId, orgId);
    if (!task) {
      throw new NotFoundException("Ticket not found");
    }

    const { data, error } = await this.supabase.client
      .from("manual_review_tasks")
      .update({ assignee_id: userId, updated_at: new Date().toISOString() })
      .eq("id", ticketId)
      .select("id, assignee_id, updated_at")
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      ticket_id: data.id,
      assignee_user_id: data.assignee_id,
      updated_at: data.updated_at,
    };
  }

  async moveReviewTicket(orgId: string, ticketId: string, lane: string) {
    const targetLane = this.parseLane(lane);
    const status = this.laneToStatus(targetLane);

    const task = await this.findTaskForOrg(ticketId, orgId);
    if (!task) {
      throw new NotFoundException("Ticket not found");
    }

    const { data, error } = await this.supabase.client
      .from("manual_review_tasks")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", ticketId)
      .select("id, status, updated_at")
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      ticket_id: data.id,
      new_stage: targetLane,
      updated_at: data.updated_at,
    };
  }

  async getReviewDetail(orgId: string, quoteId: string): Promise<ReviewDetailResponse> {
    const { data: quoteRow, error: quoteError } = await this.supabase.client
      .from("quotes")
      .select(
        `
        id,
        org_id,
        customer_id,
        status,
        total_amount,
        currency,
        created_by,
        created_at,
        updated_at,
        notes,
        items:quote_items(
          id,
          quote_id,
          total_price,
          dfm_json,
          config_json,
          created_at,
          updated_at
        )
      `,
      )
      .eq("id", quoteId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (quoteError) {
      throw quoteError;
    }

    if (!quoteRow) {
      throw new NotFoundException("Quote not found");
    }

    const { data: taskRow, error: taskError } = await this.supabase.client
      .from("manual_review_tasks")
      .select(
        `
        id,
        quote_id,
        status,
        assignee_id,
        due_at,
        notes,
        created_at,
        updated_at,
        rule:manual_review_rules(id, name, message, priority, sla_hours),
        quote:quotes(id, org_id, customer_id, status, total_amount, currency, created_by, created_at, updated_at)
      `,
      )
      .eq("quote_id", quoteId)
      .maybeSingle();

    if (taskError) {
      throw taskError;
    }

    const normalizedTask = taskRow ? this.normalizeTaskRow(taskRow as RawManualReviewTaskRow) : null;
    const task: ManualReviewTaskRow = normalizedTask ?? {
      id: `quote-${quoteRow.id}`,
      quote_id: quoteRow.id,
      status: quoteRow.status ?? "pending",
      assignee_id: null,
      due_at: null,
      notes: quoteRow.notes ?? null,
      created_at: quoteRow.created_at,
      updated_at: quoteRow.updated_at,
      rule: null,
      quote: quoteRow,
    };

    const context = await this.buildContext([task]);
    const adminItem = this.buildAdminItem(task, context.metrics.get(task.quote_id) ?? this.defaultMetrics(), {
      customer: context.customers.get(quoteRow.customer_id ?? ""),
      submitter: context.profiles.get(quoteRow.created_by ?? ""),
      assignee: context.profiles.get(task.assignee_id ?? ""),
    });

    const workspace = this.buildWorkspace(quoteRow, task, adminItem);

    return {
      item: adminItem,
      workspace,
    };
  }

  async getReviewWorkspace(orgId: string, quoteId: string) {
    const detail = await this.getReviewDetail(orgId, quoteId);
    return detail.workspace;
  }

  async simulatePriceOverride(quoteId: string, overrides: any) {
    return {
      success: true,
      quote_id: quoteId,
      overrides,
      simulated_at: new Date().toISOString(),
    };
  }

  async applyPriceOverride(quoteId: string, overrides: any, reason: any) {
    return {
      success: true,
      override_id: `ovr_${Date.now()}`,
      quote_id: quoteId,
      applied_at: new Date().toISOString(),
      reason_code: reason?.code ?? null,
      reason_text: reason?.text ?? null,
      changes: overrides,
    };
  }

  async acknowledgeDfmFinding(quoteId: string, findingId: string, note?: string) {
    return {
      success: true,
      finding_id: findingId,
      quote_id: quoteId,
      ack: true,
      note: note ?? null,
      ack_at: new Date().toISOString(),
    };
  }

  async annotateDfmFinding(quoteId: string, findingId: string, annotation: any) {
    return {
      success: true,
      finding_id: findingId,
      quote_id: quoteId,
      annotation_id: `ann_${Date.now()}`,
      note: annotation?.note ?? null,
      created_at: new Date().toISOString(),
    };
  }

  async requestChanges(quoteId: string, request: any) {
    return {
      success: true,
      request_id: `req_${Date.now()}`,
      quote_id: quoteId,
      sent_at: new Date().toISOString(),
      payload: request,
    };
  }

  async addNote(quoteId: string, note: any) {
    return {
      success: true,
      note_id: `note_${Date.now()}`,
      quote_id: quoteId,
      created_at: new Date().toISOString(),
      content: note?.content ?? null,
    };
  }

  private async fetchTasks(orgId: string): Promise<ManualReviewTaskRow[]> {
    const { data, error } = await this.supabase.client
      .from("manual_review_tasks")
      .select(
        `
        id,
        quote_id,
        status,
        assignee_id,
        due_at,
        notes,
        created_at,
        updated_at,
        rule:manual_review_rules(id, name, message, priority, sla_hours),
        quote:quotes(id, org_id, customer_id, status, total_amount, currency, created_by, created_at, updated_at, notes)
      `,
      )
      .eq("quote.org_id", orgId);

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as RawManualReviewTaskRow[];
    return rows.map((row) => this.normalizeTaskRow(row));
  }

  private async findTaskForOrg(taskId: string, orgId: string): Promise<ManualReviewTaskRow | null> {
    const { data, error } = await this.supabase.client
      .from("manual_review_tasks")
      .select(
        `
        id,
        quote_id,
        status,
        assignee_id,
        due_at,
        notes,
        created_at,
        updated_at,
        rule:manual_review_rules(id, name, message, priority, sla_hours),
        quote:quotes(id, org_id, customer_id, status, total_amount, currency, created_by, created_at, updated_at, notes)
      `,
      )
      .eq("id", taskId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const task = this.normalizeTaskRow(data as RawManualReviewTaskRow);
    if (task.quote?.org_id !== orgId) {
      return null;
    }

    return task;
  }

  private normalizeTaskRow(row: RawManualReviewTaskRow): ManualReviewTaskRow {
    const { rule, quote, ...rest } = row;
    const normalizedRule = Array.isArray(rule) ? rule[0] ?? null : rule ?? null;
    const normalizedQuote = Array.isArray(quote) ? quote[0] ?? null : quote ?? null;

    return {
      ...rest,
      rule: normalizedRule,
      quote: normalizedQuote,
    };
  }

  private async buildContext(tasks: ManualReviewTaskRow[]) {
    const quoteIds = Array.from(new Set(tasks.map((task) => task.quote_id)));
    const customerIds = Array.from(new Set(tasks.map((task) => task.quote?.customer_id).filter((id): id is string => !!id)));
    const userIds = Array.from(
      new Set(
        tasks
          .flatMap((task) => [task.assignee_id, task.quote?.created_by])
          .filter((id): id is string => !!id),
      ),
    );

    const [metrics, customers, profiles] = await Promise.all([
      this.fetchQuoteMetrics(quoteIds),
      this.fetchCustomers(customerIds),
      this.fetchProfiles(userIds),
    ]);

    return { metrics, customers, profiles };
  }

  private buildAdminItem(
    task: ManualReviewTaskRow,
    metrics: QuoteMetrics,
    contacts: { customer?: CustomerRow; submitter?: ProfileRow; assignee?: ProfileRow },
  ): AdminReviewItem {
    const quote = task.quote;
    const createdAt = quote?.created_at ?? task.created_at;
    const lastActionAt = task.updated_at ?? quote?.updated_at ?? null;
    const currency = this.resolveCurrency(quote?.currency);
    const totalAmount = this.toNumber(quote?.total_amount, metrics.totalValue);

    return {
      id: task.id,
      quoteNo: quote?.id ?? task.quote_id,
      customerName: this.resolveCustomerName(contacts.customer),
      company: this.resolveCustomerCompany(contacts.customer),
      createdAt,
      submittedBy: this.resolveSubmitter(contacts.submitter),
      lane: this.mapLane(task),
      statusReason: task.rule?.message ?? task.rule?.name ?? null,
      totalItems: metrics.itemCount,
      totalValue: Number(totalAmount.toFixed(2)),
      currency,
      dfmFindingCount: metrics.dfmFindingCount,
      priority: this.mapPriority(task),
      assignee: this.resolveAssignee(contacts.assignee, task.assignee_id),
      lastActionAt,
    };
  }

  private mapLane(task: ManualReviewTaskRow): Lane {
    switch ((task.status || "").toLowerCase()) {
      case "approved":
        return "APPROVED";
      case "rejected":
        return "REJECTED";
      case "in_review":
        return "IN_REVIEW";
      default:
        return task.assignee_id ? "IN_REVIEW" : "NEW";
    }
  }

  private mapPriority(task: ManualReviewTaskRow): Priority {
    const resolvedByRule = this.mapRulePriority(task.rule?.priority);
    if (resolvedByRule) {
      return resolvedByRule;
    }

    const resolvedByDueDate = this.mapDuePriority(task.due_at);
    if (resolvedByDueDate) {
      return resolvedByDueDate;
    }

    return "LOW";
  }

  private mapRulePriority(priority: unknown): Priority | null {
    if (typeof priority !== "number") {
      return null;
    }

    if (priority <= 1) return "EXPEDITE";
    if (priority === 2) return "HIGH";
    if (priority === 3) return "MED";
    return "LOW";
  }

  private mapDuePriority(dueAt?: string | null): Priority | null {
    if (!dueAt) {
      return null;
    }

    try {
      const hours = differenceInHours(parseISO(dueAt), new Date());
      if (Number.isNaN(hours)) {
        return null;
      }

      if (hours <= 4) return "EXPEDITE";
      if (hours <= 12) return "HIGH";
      if (hours <= 24) return "MED";
      return "LOW";
    } catch {
      return null;
    }
  }

  private laneToStatus(lane: Lane): string {
    switch (lane) {
      case "APPROVED":
        return "approved";
      case "REJECTED":
        return "rejected";
      case "IN_REVIEW":
        return "in_review";
      case "NEW":
      default:
        return "pending";
    }
  }

  private parseLane(lane: string): Lane {
    switch (lane?.toUpperCase()) {
      case "IN_REVIEW":
        return "IN_REVIEW";
      case "APPROVED":
        return "APPROVED";
      case "REJECTED":
        return "REJECTED";
      case "NEW":
      default:
        return "NEW";
    }
  }


  private buildWorkspace(quote: QuoteWithItemsRow, task: ManualReviewTaskRow, item: AdminReviewItem): ReviewDetailResponse["workspace"] {
    const dfm = this.buildDfmFindings(quote.items ?? []);
    const pricingSummary = this.buildPricingSummary(quote, item);
    const activity = this.buildActivityTimeline(quote, task, item);
    const notes = this.buildNotes(task, item);

    return {
      dfm,
      pricingSummary,
      activity,
      notes,
    };
  }

  private buildDfmFindings(items: QuoteItemDetailRow[]) {
    const findings: ReviewDetailResponse["workspace"]["dfm"] = [];
    items.forEach((line) => {
      let collection: any[] = [];
      if (Array.isArray(line.dfm_json?.issues)) {
        collection = line.dfm_json.issues;
      } else if (Array.isArray(line.dfm_json?.findings)) {
        collection = line.dfm_json.findings;
      }

      collection.forEach((issue: any, index: number) => {
        const severity = this.resolveDfmSeverity(issue?.severity);
        findings.push({
          id: issue?.id ?? `${line.id}-issue-${index}`,
          severity,
          rule: issue?.rule ?? issue?.check_id ?? issue?.code ?? "Unknown",
          partId: issue?.part_id ?? issue?.line_id ?? line.id,
          message: issue?.message ?? issue?.note ?? "",
          createdAt: issue?.created_at ?? line.updated_at ?? line.created_at,
        });
      });
    });

    return findings;
  }

  private resolveDfmSeverity(value: unknown): "LOW" | "MED" | "HIGH" {
    const normalized = typeof value === "string" ? value.toLowerCase() : "";
    if (["blocker", "critical", "high"].includes(normalized)) return "HIGH";
    if (["warn", "warning", "medium"].includes(normalized)) return "MED";
    return "LOW";
  }

  private buildPricingSummary(quote: QuoteWithItemsRow, item: AdminReviewItem) {
  const total = Number(this.toNumber(quote.total_amount, item.totalValue).toFixed(2));
    const materialCost = Number((total * 0.35).toFixed(2));
    const machiningCost = Number((total * 0.45).toFixed(2));
    const finishingCost = Number((total * 0.1).toFixed(2));

    return {
      materialCost,
      machiningCost,
      finishingCost,
      total,
      currency: item.currency,
    };
  }

  private buildActivityTimeline(
    quote: QuoteWithItemsRow,
    task: ManualReviewTaskRow,
    item: AdminReviewItem,
  ): ReviewDetailResponse["workspace"]["activity"] {
    const activity: ReviewDetailResponse["workspace"]["activity"] = [];

    activity.push({
      id: `${quote.id}-created`,
      actor: item.submittedBy,
      action: "quote_created",
      at: quote.created_at,
      meta: { status: quote.status },
    });

    if (task.assignee_id) {
      activity.push({
        id: `${task.id}-assigned`,
        actor: item.assignee ?? task.assignee_id,
        action: "ticket_assigned",
        at: task.updated_at ?? task.created_at,
        meta: { ticket: task.id },
      });
    }

    if (task.status && ["approved", "rejected"].includes(task.status)) {
      activity.push({
        id: `${task.id}-status`,
        actor: item.assignee ?? "system",
        action: `ticket_${task.status}`,
        at: task.updated_at ?? task.created_at,
        meta: { ticket: task.id },
      });
    }

    return activity.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }

  private buildNotes(task: ManualReviewTaskRow, item: AdminReviewItem): ReviewDetailResponse["workspace"]["notes"] {
    if (!task.notes) {
      return [];
    }

    return [
      {
        id: `${task.id}-note`,
        author: item.assignee ?? "system",
        text: task.notes,
        at: task.updated_at ?? task.created_at,
      },
    ];
  }

  private toNumber(value: unknown, fallback = 0): number {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }
    return fallback;
  }
}
