import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { SupabaseService } from "../../lib/supabase/supabase.service";
import { NotifyService } from "../notify/notify.service";
import { addHours } from "date-fns";
import {
  ManualReviewRule,
  CreateRuleDto,
  UpdateRuleDto,
  ReviewTask,
  GetTasksParams,
  UpdateTaskDto,
} from "./manual-review.types";
import { Quote, ReviewNotification, SlackMessage, RuleConditions } from "./manual-review.domain";

@Injectable()
export class ManualReviewService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifyService: NotifyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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
