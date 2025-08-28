import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { NotifyService } from '../notify/notify.service';
import { addHours } from 'date-fns';

@Injectable()
export class ManualReviewService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifyService: NotifyService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getRules(orgId: string) {
    const { data: rules, error } = await this.supabase
      .client
      .from('manual_review_rules')
      .select('*')
      .eq('org_id', orgId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return rules;
  }

  async createRule(orgId: string, rule: any) {
    const { data, error } = await this.supabase
      .client
      .from('manual_review_rules')
      .insert([{ ...rule, org_id: orgId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateRule(orgId: string, ruleId: string, updates: any) {
    const { data, error } = await this.supabase
      .client
      .from('manual_review_rules')
      .update(updates)
      .eq('org_id', orgId)
      .eq('id', ruleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteRule(orgId: string, ruleId: string) {
    const { error } = await this.supabase
      .client
      .from('manual_review_rules')
      .delete()
      .eq('org_id', orgId)
      .eq('id', ruleId);

    if (error) throw error;
    return true;
  }

  async checkQuoteForReview(quote: any) {
    const rules = await this.getRules(quote.org_id);
    
    for (const rule of rules) {
      if (this.quoteMatchesRule(quote, rule)) {
        await this.createReviewTask(quote, rule);
        await this.notifyService.sendReviewNotification({
          type: 'manual_review_required',
          org_id: quote.org_id,
          title: 'Manual Review Required',
          message: rule.message,
          quote_id: quote.id,
          user_id: quote.user_id,
        });

        // Send Slack notification if configured
        if (rule.slack_channel) {
          await this.notifyService.slack.chat.postMessage({
            channel: rule.slack_channel,
            text: `🔍 Manual Review Required\nQuote: ${quote.id}\nReason: ${rule.name}\nDue: ${addHours(new Date(), rule.sla_hours).toISOString()}`,
          });
        }

        // Update quote status
        await this.supabase
          .client
          .from('quotes')
          .update({ status: 'tbd_pending' })
          .eq('id', quote.id);

        return true;
      }
    }

    return false;
  }

  private async createReviewTask(quote: any, rule: any) {
    const dueAt = addHours(new Date(), rule.sla_hours);

    const { data, error } = await this.supabase
      .client
      .from('manual_review_tasks')
      .insert([{
        quote_id: quote.id,
        rule_id: rule.id,
        due_at: dueAt.toISOString(),
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  private quoteMatchesRule(quote: any, rule: any) {
    // Check process match
    if (rule.process && quote.process === rule.process) return true;

    // Check feature match
    if (rule.feature && quote.features?.includes(rule.feature)) return true;

    // Check quantity thresholds
    const qty = quote.quantity || 0;
    if (rule.min_quantity && qty >= rule.min_quantity) return true;
    if (rule.max_quantity && qty <= rule.max_quantity) return true;

    // Check size limits
    const size = Math.max(
      quote.dimensions?.length || 0,
      quote.dimensions?.width || 0,
      quote.dimensions?.height || 0
    );
    if (rule.min_size && size >= rule.min_size) return true;
    if (rule.max_size && size <= rule.max_size) return true;

    // Check material
    if (rule.material && quote.material === rule.material) return true;

    return false;
  }

  async getReviewTasks(orgId: string, params: any = {}) {
    const query = this.supabase
      .client
      .from('manual_review_tasks')
      .select(`
        *,
        quote:quotes(*),
        rule:manual_review_rules(*)
      `)
      .eq('quotes.org_id', orgId);

    if (params.status) {
      query.eq('status', params.status);
    }

    if (params.assignee_id) {
      query.eq('assignee_id', params.assignee_id);
    }

    const { data: tasks, error } = await query;

    if (error) throw error;
    return tasks;
  }

  async updateReviewTask(orgId: string, taskId: string, updates: any) {
    const { data, error } = await this.supabase
      .client
      .from('manual_review_tasks')
      .update(updates)
      .eq('id', taskId)
      .select(`
        *,
        quote:quotes(*),
        rule:manual_review_rules(*)
      `)
      .single();

    if (error) throw error;

    if (updates.status === 'approved' || updates.status === 'rejected') {
      await this.notifyService.notify({
        type: 'manual_review_completed',
        org_id: orgId,
        title: `Manual Review ${updates.status === 'approved' ? 'Approved' : 'Rejected'}`,
        message: updates.notes || '',
        quote_id: data.quote.id,
        user_id: data.quote.user_id,
      });
    }

    return data;
  }
}
