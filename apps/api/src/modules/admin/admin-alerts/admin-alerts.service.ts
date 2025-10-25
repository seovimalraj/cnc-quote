import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: string[];
  enabled: boolean;
  window: string;
  created_at: string;
  updated_at: string;
  last_triggered?: string;
}

export interface AlertIncident {
  id: string;
  rule_id: string;
  rule_name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  started_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  acknowledged_by?: string;
  description: string;
  value: number;
  threshold: number;
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms';
  target: string;
  status: 'active' | 'inactive';
  created_at: string;
  last_used?: string;
}

@Injectable()
export class AdminAlertsService {
  private readonly logger = new Logger(AdminAlertsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getAlertRules(): Promise<AlertRule[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('alert_rules')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get alert rules', error);
        return [];
      }

      return data?.map(row => ({
        id: row.id,
        name: row.name,
        condition: row.condition,
        severity: row.severity,
        channels: row.channels || [],
        enabled: row.enabled,
        window: row.window,
        created_at: row.created_at,
        updated_at: row.updated_at,
        last_triggered: row.last_triggered,
      })) || [];
    } catch (error) {
      this.logger.error('Failed to get alert rules', error);
      return [];
    }
  }

  async createAlertRule(rule: Omit<AlertRule, 'id' | 'created_at' | 'updated_at'>): Promise<AlertRule | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('alert_rules')
        .insert({
          name: rule.name,
          condition: rule.condition,
          severity: rule.severity,
          channels: rule.channels,
          enabled: rule.enabled,
          window: rule.window,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create alert rule', error);
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        condition: data.condition,
        severity: data.severity,
        channels: data.channels || [],
        enabled: data.enabled,
        window: data.window,
        created_at: data.created_at,
        updated_at: data.updated_at,
        last_triggered: data.last_triggered,
      };
    } catch (error) {
      this.logger.error('Failed to create alert rule', error);
      return null;
    }
  }

  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('alert_rules')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        this.logger.error('Failed to update alert rule', error);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to update alert rule', error);
      return false;
    }
  }

  async deleteAlertRule(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('alert_rules')
        .delete()
        .eq('id', id);

      if (error) {
        this.logger.error('Failed to delete alert rule', error);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to delete alert rule', error);
      return false;
    }
  }

  async toggleAlertRule(id: string): Promise<boolean> {
    try {
      // First get current state
      const { data: current, error: fetchError } = await this.supabase.client
        .from('alert_rules')
        .select('enabled')
        .eq('id', id)
        .single();

      if (fetchError) {
        this.logger.error('Failed to fetch alert rule for toggle', fetchError);
        return false;
      }

      // Toggle the state
      const { error } = await this.supabase.client
        .from('alert_rules')
        .update({
          enabled: !current.enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        this.logger.error('Failed to toggle alert rule', error);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to toggle alert rule', error);
      return false;
    }
  }

  async testAlertRule(id: string): Promise<boolean> {
    try {
      // Get the rule
      const { data: rule, error: fetchError } = await this.supabase.client
        .from('alert_rules')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !rule) {
        this.logger.error('Failed to fetch alert rule for test', fetchError);
        return false;
      }

      // Send test alert to all channels
      await this.sendTestAlert(rule);

      return true;
    } catch (error) {
      this.logger.error('Failed to test alert rule', error);
      return false;
    }
  }

  async getAlertIncidents(): Promise<AlertIncident[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('alert_incidents')
        .select(`
          *,
          alert_rules(name)
        `)
        .order('started_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get alert incidents', error);
        return [];
      }

      return data?.map(row => ({
        id: row.id,
        rule_id: row.rule_id,
        rule_name: row.alert_rules?.name || 'Unknown Rule',
        severity: row.severity,
        status: row.status,
        started_at: row.started_at,
        acknowledged_at: row.acknowledged_at,
        resolved_at: row.resolved_at,
        acknowledged_by: row.acknowledged_by,
        description: row.description,
        value: row.value,
        threshold: row.threshold,
      })) || [];
    } catch (error) {
      this.logger.error('Failed to get alert incidents', error);
      return [];
    }
  }

  async acknowledgeIncident(id: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('alert_incidents')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: userId,
        })
        .eq('id', id);

      if (error) {
        this.logger.error('Failed to acknowledge incident', error);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to acknowledge incident', error);
      return false;
    }
  }

  async resolveIncident(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('alert_incidents')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) {
        this.logger.error('Failed to resolve incident', error);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to resolve incident', error);
      return false;
    }
  }

  async getAlertChannels(): Promise<AlertChannel[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('alert_channels')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        this.logger.error('Failed to get alert channels', error);
        return [];
      }

      return data?.map(row => ({
        id: row.id,
        type: row.type,
        target: row.target,
        status: row.status,
        created_at: row.created_at,
        last_used: row.last_used,
      })) || [];
    } catch (error) {
      this.logger.error('Failed to get alert channels', error);
      return [];
    }
  }

  async createAlertChannel(channel: Omit<AlertChannel, 'id' | 'created_at'>): Promise<AlertChannel | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('alert_channels')
        .insert({
          type: channel.type,
          target: channel.target,
          status: channel.status,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to create alert channel', error);
        return null;
      }

      return {
        id: data.id,
        type: data.type,
        target: data.target,
        status: data.status,
        created_at: data.created_at,
        last_used: data.last_used,
      };
    } catch (error) {
      this.logger.error('Failed to create alert channel', error);
      return null;
    }
  }

  async deleteAlertChannel(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('alert_channels')
        .delete()
        .eq('id', id);

      if (error) {
        this.logger.error('Failed to delete alert channel', error);
        return false;
      }

      return true;
    } catch (error) {
      this.logger.error('Failed to delete alert channel', error);
      return false;
    }
  }

  async evaluateAlertRules(): Promise<void> {
    try {
      const rules = await this.getAlertRules();
      const enabledRules = rules.filter(rule => rule.enabled);

      for (const rule of enabledRules) {
        await this.evaluateRule(rule);
      }
    } catch (error) {
      this.logger.error('Failed to evaluate alert rules', error);
    }
  }

  private async evaluateRule(rule: AlertRule): Promise<void> {
    try {
      // Parse condition (simplified for demo)
      const condition = this.parseCondition(rule.condition);
      if (!condition) return;

      // Get current metric value
      const currentValue = await this.getMetricValue(condition.metric, condition.aggregator, rule.window);

      if (currentValue === null) {
        this.logger.warn(`Metric ${condition.metric} (${condition.aggregator}) returned no datapoints for window ${rule.window}`);
        return;
      }

      // Check if condition is met
      const isTriggered = this.checkCondition(currentValue, condition.operator, condition.threshold);

      if (isTriggered) {
        await this.createIncident(rule, currentValue, condition.threshold);
      }
    } catch (error) {
      this.logger.error(`Failed to evaluate rule ${rule.id}`, error);
    }
  }

  private parseCondition(condition: string): { metric: string; aggregator: string; operator: string; threshold: number } | null {
    // Simple condition parser: "p95(first_price) > 2000"
    const match = condition.match(/^(\w+)\(([\w\.:-]+)\) ([><=]+) ([\d\.]+)$/);
    if (!match) return null;

    return {
      aggregator: match[1].toLowerCase(),
      metric: match[2],
      operator: match[3],
      threshold: parseFloat(match[4]),
    };
  }

  private async getMetricValue(metric: string, aggregator: string, window: string): Promise<number | null> {
    const cacheKey = `admin-alert-metric:${aggregator}:${metric}:${window}`;
    const cached = await this.cache.get<number | null>(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const windowMs = this.parseWindow(window);
    const since = new Date(Date.now() - windowMs).toISOString();
    const normalizedAggregator = aggregator?.toLowerCase() || 'latest';

    const percentileMatch = normalizedAggregator.match(/^p(\d{2})$/);
    if (percentileMatch) {
      const { data, error } = await this.supabase.client
        .from('metrics_timeseries')
        .select('value')
        .eq('metric', metric)
        .eq('percentile', normalizedAggregator)
        .gte('timestamp', since)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        this.logger.error(`Failed to fetch percentile metric ${normalizedAggregator} for ${metric}`, error);
        await this.cache.set(cacheKey, null, 15);
        return null;
      }

      const value = data?.[0]?.value ?? null;
      await this.cache.set(cacheKey, value, 30);
      return value;
    }

    if (normalizedAggregator === 'gauge' || normalizedAggregator === 'latest') {
      const { data, error } = await this.supabase.client
        .from('metrics_gauges')
        .select('value')
        .eq('metric', metric)
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        this.logger.error(`Failed to fetch gauge metric for ${metric}`, error);
        await this.cache.set(cacheKey, null, 15);
        return null;
      }

      const value = data?.[0]?.value ?? null;
      await this.cache.set(cacheKey, value, 30);
      return value;
    }

    const { data, error } = await this.supabase.client
      .from('metrics_timeseries')
      .select('value')
      .eq('metric', metric)
      .gte('timestamp', since)
      .order('timestamp', { ascending: false })
      .limit(500);

    if (error) {
      this.logger.error(`Failed to fetch timeseries for metric ${metric}`, error);
      await this.cache.set(cacheKey, null, 15);
      return null;
    }

    const values = (data ?? [])
      .map((row) => (typeof row.value === 'number' ? row.value : Number(row.value)))
      .filter((value) => Number.isFinite(value)) as number[];

    if (!values.length) {
      await this.cache.set(cacheKey, null, 15);
      return null;
    }

    let computed: number;
    switch (normalizedAggregator) {
      case 'avg':
      case 'mean':
        computed = values.reduce((sum, value) => sum + value, 0) / values.length;
        break;
      case 'max':
        computed = Math.max(...values);
        break;
      case 'min':
        computed = Math.min(...values);
        break;
      case 'sum':
        computed = values.reduce((sum, value) => sum + value, 0);
        break;
      case 'count':
        computed = values.length;
        break;
      default:
        computed = values[0];
        break;
    }

    await this.cache.set(cacheKey, computed, 30);
    return computed;
  }

  private parseWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 60 * 60 * 1000; // default 1h
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 60 * 60 * 1000;
    }
  }

  private checkCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      default: return false;
    }
  }

  private async createIncident(rule: AlertRule, value: number, threshold: number): Promise<void> {
    try {
      // Check if incident already exists for this rule
      const { data: existing } = await this.supabase.client
        .from('alert_incidents')
        .select('id')
        .eq('rule_id', rule.id)
        .eq('status', 'active')
        .limit(1);

      if (existing?.length) return; // Incident already active

      const { error } = await this.supabase.client
        .from('alert_incidents')
        .insert({
          rule_id: rule.id,
          severity: rule.severity,
          status: 'active',
          started_at: new Date().toISOString(),
          description: `${rule.name} triggered`,
          value,
          threshold,
        });

      if (error) {
        this.logger.error('Failed to create incident', error);
      } else {
        // Send alerts to channels
        await this.sendAlert(rule, value, threshold);
      }
    } catch (error) {
      this.logger.error('Failed to create incident', error);
    }
  }

  private async sendAlert(rule: AlertRule, value: number, threshold: number): Promise<void> {
    // Implementation would send to actual channels (email, slack, etc.)
    this.logger.log(`Alert triggered: ${rule.name} - Value: ${value}, Threshold: ${threshold}`);
  }

  private async sendTestAlert(rule: AlertRule): Promise<void> {
    // Implementation would send test alert to channels
    this.logger.log(`Test alert sent for rule: ${rule.name}`);
  }
}
