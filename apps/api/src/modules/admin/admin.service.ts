import { Injectable } from "@nestjs/common";

@Injectable()
export class AdminService {
  private readonly mockUsers = [
    { id: 'u_1', email: 'john.doe@example.com', role: 'admin', org: 'Acme Corp', status: 'active', created_at: '2025-01-02T10:00:00Z' },
    { id: 'u_2', email: 'designer@example.com', role: 'customer', org: 'Beta LLC', status: 'pending', created_at: '2025-02-15T09:30:00Z' },
    { id: 'u_3', email: 'ops@example.com', role: 'reviewer', org: 'Acme Corp', status: 'active', created_at: '2025-03-05T12:10:00Z' },
    { id: 'u_4', email: 'finance@example.com', role: 'finance', org: 'Acme Corp', status: 'active', created_at: '2025-04-11T08:45:00Z' },
    { id: 'u_5', email: 'maker@example.com', role: 'customer', org: 'Makers Ltd', status: 'active', created_at: '2025-05-22T14:30:00Z' }
  ];

  private readonly mockOrgs = [
    { id: 'org_1', name: 'Acme Corp', user_count: 14, plan: 'pro', created_at: '2024-12-12T12:00:00Z' },
    { id: 'org_2', name: 'Beta LLC', user_count: 4, plan: 'free', created_at: '2025-02-01T12:00:00Z' },
    { id: 'org_3', name: 'Makers Ltd', user_count: 9, plan: 'pro', created_at: '2025-03-14T09:00:00Z' }
  ];

  async listUsers(page = 1, pageSize = 25, q?: string) {
    let src = this.mockUsers;
    if (q) {
      const term = q.toLowerCase();
      src = src.filter(u =>
        u.email.toLowerCase().includes(term) ||
        u.role.toLowerCase().includes(term) ||
        u.org.toLowerCase().includes(term) ||
        u.status.toLowerCase().includes(term)
      );
    }
    const total = src.length;
    const start = (page - 1) * pageSize;
    const data = src.slice(start, start + pageSize);
    return { data, total, page, page_size: pageSize, q: q || null };
  }

  async listOrgs(page = 1, pageSize = 25, q?: string) {
    let src = this.mockOrgs;
    if (q) {
      const term = q.toLowerCase();
      src = src.filter(o =>
        o.name.toLowerCase().includes(term) ||
        o.plan.toLowerCase().includes(term)
      );
    }
    const total = src.length;
    const start = (page - 1) * pageSize;
    const data = src.slice(start, start + pageSize);
    return { data, total, page, page_size: pageSize, q: q || null };
  }
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
  const re = /^(\d+)([smhd])$/;
  const execResult = re.exec(window);
  if (!execResult) return 60 * 60 * 1000;
  const num = execResult[1];
  const unit = execResult[2];
    const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return parseInt(num) * multipliers[unit as keyof typeof multipliers];
  }
}
