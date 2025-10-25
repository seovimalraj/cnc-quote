import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from "../supabase/supabase.service";

export interface RateLimitConfig {
  limit: number;
  windowMinutes: number;
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  // Default rate limits
  private readonly defaultLimits: Record<string, RateLimitConfig> = {
    dfm_submit: { limit: 10, windowMinutes: 1 }, // 10 DFM submissions per minute per IP
    lead_create: { limit: 5, windowMinutes: 60 }, // 5 leads per hour per IP/email
    invite_send: { limit: 3, windowMinutes: 60 }, // 3 invites per hour per email
  };

  constructor(private readonly supabaseService: SupabaseService) {}

  async checkRateLimit(
    identifier: string,
    action: string,
    customLimit?: RateLimitConfig,
  ): Promise<{ allowed: boolean; remainingRequests?: number; resetTime?: Date }> {
    try {
      const config = customLimit || this.defaultLimits[action];
      if (!config) {
        // No rate limit configured for this action, allow it
        return { allowed: true };
      }

      const supabase = this.supabaseService.client;

      // Call the database function to check rate limit
      const { data, error } = await supabase.rpc('check_rate_limit', {
        p_identifier: identifier,
        p_action: action,
        p_limit: config.limit,
        p_window_minutes: config.windowMinutes,
      });

      if (error) {
        this.logger.error('Error checking rate limit:', error);
        // On error, allow the request to avoid blocking legitimate users
        return { allowed: true };
      }

      const allowed = data as boolean;

      if (allowed) {
        // Calculate remaining requests and reset time
        const resetTime = new Date();
        resetTime.setMinutes(resetTime.getMinutes() + config.windowMinutes);

        return {
          allowed: true,
          remainingRequests: config.limit - 1, // Approximate
          resetTime,
        };
      }

      return { allowed: false };
    } catch (error) {
      this.logger.error('Error in rate limit check:', error);
      // On error, allow the request
      return { allowed: true };
    }
  }

  async getRateLimitStatus(
    identifier: string,
    action: string,
  ): Promise<{ currentCount: number; limit: number; resetTime: Date } | null> {
    try {
      const config = this.defaultLimits[action];
      if (!config) {
        return null;
      }

      const supabase = this.supabaseService.client;
      const windowStart = new Date();
      windowStart.setMinutes(windowStart.getMinutes() - config.windowMinutes);

      const { data, error } = await supabase
        .from('rate_limits')
        .select('request_count')
        .eq('identifier', identifier)
        .eq('action', action)
        .gte('window_start', windowStart.toISOString())
        .single();

      if (error || !data) {
        return {
          currentCount: 0,
          limit: config.limit,
          resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000),
        };
      }

      return {
        currentCount: data.request_count,
        limit: config.limit,
        resetTime: new Date(Date.now() + config.windowMinutes * 60 * 1000),
      };
    } catch (error) {
      this.logger.error('Error getting rate limit status:', error);
      return null;
    }
  }
}
