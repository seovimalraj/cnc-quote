import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // In a real implementation, this would proxy to the backend
    // For now, return mock data
    const mockData = {
      needs_review: [
        {
          id: 'rev_001',
          quote_id: 'Q41-1742-8058',
          org_name: 'Acme Corp',
          stage: 'Needs_Review',
          assignee_user_id: null,
          priority: 'high',
          sla_due_at: '2025-09-06T10:00:00Z',
          value_estimate: 227.98,
          blockers_count: 2,
          files_count: 3,
          created_at: '2025-09-04T14:30:00Z',
          updated_at: '2025-09-05T09:15:00Z',
          first_price_ms: 1450,
          cad_status: 'Succeeded',
          top_dfm_issues: ['Wall thickness too thin', 'Sharp internal corners']
        }
      ],
      priced: [],
      sent: []
    };

    return NextResponse.json(mockData);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch review queue' }, { status: 500 });
  }
}
