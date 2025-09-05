import { Injectable } from "@nestjs/common";

@Injectable()
export class AdminService {
  async getReviewSummary(window: string = '1h') {
    // Mock review summary - in real implementation, this would query the manual review service
    return {
      count: 12,
      new_count: 3,
      aging_count: 6,
      breached_count: 3,
      items: [
        {
          quote_id: 'Q41-1742-8058',
          org: 'Acme Corp',
          value: 227.98,
          dfm_blockers: 0,
          age_min: 35,
          assignee: 'me@shop.com'
        },
        {
          quote_id: 'Q41-1742-8059',
          org: 'TechStart Inc',
          value: 1450.50,
          dfm_blockers: 2,
          age_min: 180,
          assignee: 'Unassigned'
        }
      ]
    };
  }

  async getDatabaseMetrics(window: string = '1h') {
    // Mock database metrics - in real implementation, this would query actual DB metrics
    return {
      read_p95_ms: 18,
      write_p95_ms: 22,
      error_rate_pct: 0.2,
      timeseries: {
        t: ['12:01', '12:02', '12:03'],
        read_ms: [15, 20, 18],
        write_ms: [18, 25, 22]
      }
    };
  }

  async getWebhookStatus(window: string = '1h') {
    // Mock webhook status - in real implementation, this would query webhook logs
    return {
      stripe: {
        status: 'OK',
        failed_24h: 0,
        last_event_type: 'checkout.session.completed',
        last_delivery_age: 42
      },
      paypal: {
        status: 'WARN',
        failed_24h: 1,
        last_event_type: 'PAYMENT.CAPTURE.COMPLETED',
        last_delivery_age: 180
      }
    };
  }

  async replayWebhooks(provider: string, window: string = '24h') {
    // Mock webhook replay - in real implementation, this would trigger webhook replays
    return {
      provider,
      replayed: provider === 'stripe' ? 0 : 1,
      window_seconds: this.parseTimeWindow(window) / 1000
    };
  }

  async getSLOMetrics(window: string = '1h') {
    // Mock SLO metrics - in real implementation, this would calculate from actual metrics
    return {
      first_price_p95_ms: 1450,
      cad_p95_ms: 18000,
      payment_to_order_p95_ms: 6200,
      oldest_job_age_sec: 210
    };
  }

  async getErrors(window: string = '1h') {
    // Mock error data - in real implementation, this would query Sentry/error logs
    return {
      sentry: [
        {
          id: 'err_123',
          service: 'api',
          title: 'TypeError: Cannot read property \'x\'',
          count_1h: 12,
          first_seen: '2025-09-05T10:22:00Z',
          last_seen: '2025-09-05T11:10:00Z',
          users_affected: 3,
          permalink: 'https://sentry.io/...'
        }
      ]
    };
  }

  async createIssue(source: string, errorId: string) {
    // Mock issue creation - in real implementation, this would create a ticket/issue
    return {
      success: true,
      issue_id: `issue_${Date.now()}`,
      source,
      error_id: errorId
    };
  }

  private parseTimeWindow(window: string): number {
    const match = window.match(/^(\d+)([smhd])$/);
    if (!match) return 60 * 60 * 1000; // Default 1h

    const [, num, unit] = match;
    const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return parseInt(num) * multipliers[unit as keyof typeof multipliers];
  }
}
