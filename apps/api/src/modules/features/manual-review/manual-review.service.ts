import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { NotifyService } from "../notify/notify.service";
import { addHours } from "date-fns";
import {
  ManualReviewRule,
  CreateRuleDto,
  UpdateRuleDto,
  ReviewTask,
  GetTasksParams,
  UpdateTaskDto,
  ManualReviewRuleType,
} from "./manual-review.types";
import { Quote, SlackMessage, RuleConditions } from "./manual-review.domain";
import type { PricingComplianceEventCode } from "../pricing/pricing-compliance.service";

@Injectable()
export class ManualReviewService {
  private static readonly PRICING_GUARDRAIL_RULE_NAME = "Pricing Compliance Guardrail";
  private static readonly PRICING_GUARDRAIL_REASON = "pricing_compliance_guardrail";

  private readonly logger = new Logger(ManualReviewService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifyService: NotifyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async escalatePricingGuardrail(params: {
    orgId: string;
    quoteId: string;
    quoteItemId: string;
    traceId: string;
    triggeredAt: Date;
    events: Array<{
      code: PricingComplianceEventCode;
      message: string;
      quantity: number;
      partId?: string | null;
    }>;
    eventIds: string[];
    quoteSnapshot?: {
      status?: string | null;
      createdBy?: string | null;
      userId?: string | null;
      number?: string | null;
    };
    partSnapshot?: {
      id?: string | null;
      number?: string | null;
    };
  }): Promise<{ action: "created" | "updated" | "skipped"; taskId?: string }>
  {
    if (!params.events?.length) {
      return { action: "skipped" };
    }

    const rule = await this.ensurePricingGuardrailRule(params.orgId);
    const slaHours = this.resolveGuardrailSlaHours(rule);
    const dueAt = addHours(params.triggeredAt, slaHours);
    const notes = this.buildComplianceNotes({
      quoteId: params.quoteId,
      quoteItemId: params.quoteItemId,
      traceId: params.traceId,
      events: params.events,
      eventIds: params.eventIds,
      part: params.partSnapshot,
      quoteStatus: params.quoteSnapshot?.status,
    });

    const existingResult = await this.supabase.client
      .from("manual_review_tasks")
      .select("id, status, notes")
      .eq("quote_id", params.quoteId)
      .eq("rule_id", rule.id)
      .in("status", ["pending", "in_review"])
      .maybeSingle();

    if (existingResult.error) {
      if (existingResult.error.code === "PGRST116") {
        const { data, error } = await this.supabase.client
          .from("manual_review_tasks")
          .select("id, status, notes")
          .eq("quote_id", params.quoteId)
          .eq("rule_id", rule.id)
          .in("status", ["pending", "in_review"])
          .order("created_at", { ascending: false })
          .limit(1);

        if (error) {
          throw error;
        }

        existingResult.data = data?.[0] ?? null;
      } else {
        throw existingResult.error;
      }
    }

    const existing = existingResult.data;

    if (existing) {
      const mergedNotes = this.mergeComplianceNotes(existing.notes as string | null, notes);
      const { error: updateError } = await this.supabase.client
        .from("manual_review_tasks")
        .update({
          due_at: dueAt.toISOString(),
          notes: mergedNotes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        throw updateError;
      }

      this.logger.debug(
        `Updated manual review task ${existing.id} for quote=${params.quoteId} with new compliance notes`,
      );
      return { action: "updated", taskId: existing.id };
    }

    const { data: created, error: insertError } = await this.supabase.client
      .from("manual_review_tasks")
      .insert([
        {
          quote_id: params.quoteId,
          rule_id: rule.id,
          status: "pending",
          due_at: dueAt.toISOString(),
          notes,
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      throw insertError;
    }

    const { error: statusError } = await this.supabase.client
      .from("quotes")
      .update({ status: "tbd_pending", updated_at: new Date().toISOString() })
      .eq("id", params.quoteId)
      .neq("status", "tbd_pending");

    if (statusError && statusError.code !== "PGRST116") {
      this.logger.warn(
        `Failed to update quote=${params.quoteId} status after guardrail escalation: ${statusError.message}`,
      );
    }

    try {
      await this.notifyService.sendReviewNotification({
        quoteId: params.quoteId,
        ruleId: rule.id,
        dueAt,
        slackChannel: (rule as any)?.slack_channel ?? undefined,
      });
    } catch (notifyError) {
      const err = notifyError as Error;
      this.logger.warn(
        `Failed to dispatch manual review notification for quote=${params.quoteId}: ${err.message}`,
      );
    }

    this.logger.log(
      `Created manual review task ${created.id} for quote=${params.quoteId} (pricing compliance guardrail)`,
    );
    return { action: "created", taskId: created.id };
  }

  private async ensurePricingGuardrailRule(orgId: string): Promise<ManualReviewRule> {
    const { data: existing, error } = await this.supabase.client
      .from("manual_review_rules")
      .select("id, org_id, name, description, message, sla_hours, slack_channel, conditions, active, priority")
      .eq("org_id", orgId)
      .eq("name", ManualReviewService.PRICING_GUARDRAIL_RULE_NAME)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (existing) {
      return existing as ManualReviewRule;
    }

    const defaultSla = 4;
    const insertPayload: Partial<ManualReviewRule> & {
      org_id: string;
      description: string;
      conditions: Record<string, unknown>;
    } = {
      org_id: orgId,
      name: ManualReviewService.PRICING_GUARDRAIL_RULE_NAME,
      description: "System guardrail generated from pricing compliance events",
      type: ManualReviewRuleType.PRICE,
      message: "Pricing compliance guardrail triggered. Manual review required before release.",
      sla_hours: defaultSla,
      active: true,
      priority: 1,
      conditions: {
        sla_hours: defaultSla,
        reason: ManualReviewService.PRICING_GUARDRAIL_REASON,
        severity: "critical",
      },
    };

    const { data: created, error: insertError } = await this.supabase.client
      .from("manual_review_rules")
      .insert([insertPayload])
      .select("id, org_id, name, description, message, sla_hours, slack_channel, conditions, active, priority")
      .single();

    if (insertError) {
      throw insertError;
    }

    this.logger.log(`Created system manual review rule for org=${orgId}`);
    return created as ManualReviewRule;
  }

  private resolveGuardrailSlaHours(rule: ManualReviewRule): number {
    const conditions = rule.conditions as RuleConditions | undefined;
    if (conditions && typeof conditions.sla_hours === "number") {
      return conditions.sla_hours;
    }
    if (typeof rule.sla_hours === "number" && Number.isFinite(rule.sla_hours)) {
      return rule.sla_hours;
    }
    return 4;
  }

  private buildComplianceNotes(params: {
    quoteId: string;
    quoteItemId: string;
    traceId: string;
    events: Array<{ code: PricingComplianceEventCode; message: string; quantity: number; partId?: string | null }>;
    eventIds: string[];
    part?: { id?: string | null; number?: string | null };
    quoteStatus?: string | null;
  }): string {
    const lines: string[] = [];
    lines.push(`Pricing compliance guardrail triggered for quote ${params.quoteId}`);
    lines.push(`Quote item: ${params.quoteItemId}`);
    if (params.part?.id) {
      const partDetails = params.part.number ? `${params.part.id} (${params.part.number})` : params.part.id;
      lines.push(`Part: ${partDetails}`);
    }
    if (params.quoteStatus) {
      lines.push(`Previous quote status: ${params.quoteStatus}`);
    }
    lines.push(`Trace ID: ${params.traceId}`);
    lines.push("Events:");
    for (const event of params.events) {
      lines.push(`- ${event.code} (qty ${event.quantity}) :: ${event.message}`);
    }
    if (params.eventIds.length > 0) {
      lines.push(`Event IDs: ${params.eventIds.join(", ")}`);
    }
    return lines.join("\n");
  }

  private mergeComplianceNotes(existingNotes: string | null, newNotes: string): string {
    if (!existingNotes || existingNotes.trim().length === 0) {
      return newNotes;
    }
    if (existingNotes.includes(newNotes)) {
      return existingNotes;
    }
    return `${existingNotes}\n---\n${newNotes}`;
  }

  async getRules(orgId: string): Promise<ManualReviewRule[]> {
    const { data: rules, error } = await this.supabase.client
      .from("manual_review_rules")
      .select("*")
      .eq("org_id", orgId)
      .eq("active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return rules;
  }

  async createRule(orgId: string, rule: CreateRuleDto): Promise<ManualReviewRule> {
    const { data, error } = await this.supabase.client
      .from("manual_review_rules")
      .insert([{ ...rule, org_id: orgId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateRule(orgId: string, ruleId: string, updates: UpdateRuleDto): Promise<ManualReviewRule> {
    const { data, error } = await this.supabase.client
      .from("manual_review_rules")
      .update(updates)
      .eq("org_id", orgId)
      .eq("id", ruleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteRule(orgId: string, ruleId: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from("manual_review_rules")
      .delete()
      .eq("org_id", orgId)
      .eq("id", ruleId);

    if (error) throw error;
    return true;
  }

  async checkQuoteForReview(quote: Quote): Promise<boolean> {
    const rules = await this.getRules(quote.org_id);

    for (const rule of rules) {
      if (this.quoteMatchesRule(quote, rule)) {
        await this.createReviewTask(quote, rule);
        const dueAt = addHours(new Date(), rule.sla_hours || 24);
        await this.notifyService.sendReviewNotification({
          quoteId: quote.id,
          ruleId: rule.id,
          dueAt,
          recipientEmail: quote.user_id, // Assuming user_id is an email
          slackChannel: rule.slack_channel,
        });

        // Send Slack notification if configured
        if (rule.slack_channel) {
          await this.notifyService.slack.chat.postMessage({
            channel: rule.slack_channel,
            text: `🔍 Manual Review Required\nQuote: ${quote.id}\nReason: ${rule.name}\nDue: ${addHours(new Date(), rule.sla_hours || 24).toISOString()}`,
          } as SlackMessage);
        }

        // Update quote status
        await this.supabase.client.from("quotes").update({ status: "tbd_pending" }).eq("id", quote.id);

        return true;
      }
    }

    return false;
  }

  private async createReviewTask(quote: Quote, rule: ManualReviewRule): Promise<ReviewTask> {
    const dueAt = addHours(new Date(), rule.conditions.sla_hours || 24);

    const { data, error } = await this.supabase.client
      .from("manual_review_tasks")
      .insert([
        {
          quote_id: quote.id,
          rule_id: rule.id,
          due_at: dueAt.toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private quoteMatchesRule(quote: Quote, rule: ManualReviewRule): boolean {
    const conditions = rule.conditions as RuleConditions;

    // Check process match
    if (conditions.process && quote.process_type === conditions.process) return true;

    // Check feature match
    if (conditions.feature && quote.features?.includes(conditions.feature)) return true;

    // Check quantity thresholds
    const qty = quote.quantity || 0;
    if (conditions.min_quantity && qty >= conditions.min_quantity) return true;
    if (conditions.max_quantity && qty <= conditions.max_quantity) return true;

    // Check size limits
    const size = Math.max(quote.dimensions?.length || 0, quote.dimensions?.width || 0, quote.dimensions?.height || 0);
    if (conditions.min_size && size >= conditions.min_size) return true;
    if (conditions.max_size && size <= conditions.max_size) return true;

    // Check material
    if (conditions.material && quote.material_id === conditions.material) return true;

    return false;
  }

  async getReviewTasks(orgId: string, params: GetTasksParams): Promise<ReviewTask[]> {
    const query = this.supabase.client
      .from("manual_review_tasks")
      .select(
        `
        *,
        quote:quotes(*),
        rule:manual_review_rules(*)
      `,
      )
      .eq("quotes.org_id", orgId);

    if (params.status) {
      query.eq("status", params.status);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;
    return tasks;
  }

  async updateReviewTask(orgId: string, taskId: string, updates: UpdateTaskDto): Promise<ReviewTask> {
    const { data, error } = await this.supabase.client
      .from("manual_review_tasks")
      .update(updates)
      .eq("id", taskId)
      .select(
        `
        *,
        quote:quotes(*),
        rule:manual_review_rules(*)
      `,
      )
      .single();

    if (error) throw error;

    if (updates.status === "approved" || updates.status === "rejected") {
      await this.notifyService.notify({
        subject: `Manual Review ${updates.status === "approved" ? "Approved" : "Rejected"}`,
        body: updates.review_notes || "",
        recipientEmail: data.quote.user_id, // Assuming user_id is an email
        slackChannel: data.rule.slack_channel,
      });
    }

    return data;
  }
}
