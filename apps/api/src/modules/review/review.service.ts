import { Injectable } from "@nestjs/common";

@Injectable()
export class ReviewService {
  async getReviewQueue(filters: any = {}) {
    // Mock review queue data
    return {
      needs_review: [
        {
          id: 'rev_001',
          quote_id: 'Q41-1742-8058',
          org_id: 'org_acme',
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
          sources: ['dfm_blocker', 'tight_tolerance'],
          first_price_ms: 1450,
          cad_status: 'Succeeded',
          top_dfm_issues: ['Wall thickness too thin', 'Sharp internal corners']
        },
        {
          id: 'rev_002',
          quote_id: 'Q41-1742-8059',
          org_id: 'org_techstart',
          org_name: 'TechStart Inc',
          stage: 'Needs_Review',
          assignee_user_id: 'user_jane',
          priority: 'normal',
          sla_due_at: '2025-09-07T16:00:00Z',
          value_estimate: 1450.50,
          blockers_count: 0,
          files_count: 1,
          created_at: '2025-09-03T11:20:00Z',
          updated_at: '2025-09-05T08:45:00Z',
          sources: ['manual_flag'],
          first_price_ms: 890,
          cad_status: 'Succeeded',
          top_dfm_issues: []
        }
      ],
      priced: [
        {
          id: 'rev_003',
          quote_id: 'Q41-1742-8060',
          org_id: 'org_widgetco',
          org_name: 'Widget Co',
          stage: 'Priced',
          assignee_user_id: 'user_john',
          priority: 'low',
          sla_due_at: '2025-09-08T12:00:00Z',
          value_estimate: 89.99,
          blockers_count: 0,
          files_count: 2,
          created_at: '2025-09-02T09:10:00Z',
          updated_at: '2025-09-05T07:30:00Z',
          sources: ['abandoned_reengaged'],
          first_price_ms: 650,
          cad_status: 'Succeeded',
          top_dfm_issues: []
        }
      ],
      sent: []
    };
  }

  async getReviewCounts() {
    return {
      needs_review: 2,
      priced: 1,
      sent: 0,
      total: 3
    };
  }

  async assignReviewTicket(ticketId: string, userId: string) {
    // Mock assignment
    return {
      success: true,
      ticket_id: ticketId,
      assignee_user_id: userId,
      updated_at: new Date().toISOString()
    };
  }

  async moveReviewTicket(ticketId: string, lane: string) {
    // Mock move
    return {
      success: true,
      ticket_id: ticketId,
      new_stage: lane,
      updated_at: new Date().toISOString()
    };
  }

  async getReviewWorkspace(quoteId: string) {
    // Mock workspace data
    return {
      quote: {
        id: quoteId,
        org_id: 'org_acme',
        org_name: 'Acme Corp',
        status: 'Needs_Review',
        created_at: '2025-09-04T14:30:00Z',
        value_estimate: 227.98
      },
      lines: [
        {
          id: 'line_001',
          part_name: 'Bracket Assembly',
          quantity: 50,
          process: 'CNC Milling',
          material: 'Aluminum 6061',
          finish: 'Anodized',
          dfm_status: 'blocker',
          unit_price: 4.56,
          total_price: 228.00,
          files: ['bracket.stl', 'bracket.step']
        }
      ],
      dfm_results: {
        task_id: 'dfm_123',
        summary: {
          passed: 15,
          total: 20,
          warnings: 3,
          blockers: 2
        },
        findings: [
          {
            id: 'finding_001',
            line_id: 'line_001',
            check_id: 'wall_thickness',
            severity: 'blocker',
            message: 'Wall thickness 0.8mm is below minimum 1.5mm for CNC milling',
            metrics: { actual: 0.8, minimum: 1.5, unit: 'mm' },
            face_ids: [12, 13],
            edge_ids: [],
            ack: false,
            note: null
          },
          {
            id: 'finding_002',
            line_id: 'line_001',
            check_id: 'internal_corners',
            severity: 'warning',
            message: 'Sharp internal corners may require special tooling',
            metrics: { angle: 85, radius: 0.1 },
            face_ids: [],
            edge_ids: [45, 46],
            ack: false,
            note: null
          }
        ]
      },
      pricing: {
        subtotal: 228.00,
        taxes: 18.24,
        shipping: 15.00,
        total: 261.24
      },
      activity: [
        {
          id: 'act_001',
          ts: '2025-09-05T09:15:00Z',
          actor: 'system',
          event: 'dfm_completed',
          details: 'DFM analysis completed with 2 blockers',
          diff_link: null
        },
        {
          id: 'act_002',
          ts: '2025-09-04T14:30:00Z',
          actor: 'customer',
          event: 'quote_submitted',
          details: 'Quote submitted for review',
          diff_link: null
        }
      ]
    };
  }

  async simulatePriceOverride(quoteId: string, overrides: any) {
    // Mock price simulation
    return {
      original: {
        unit_price: 4.56,
        total_price: 228.00,
        breakdown: {
          setup: 25.00,
          machine_time: 85.60,
          material: 45.20,
          tooling: 12.50,
          finish: 8.75,
          inspection: 5.00,
          risk: 3.50,
          overhead: 22.40,
          margin: 20.00
        }
      },
      simulated: {
        unit_price: 5.12,
        total_price: 256.00,
        breakdown: {
          setup: 30.00,
          machine_time: 95.80,
          material: 50.40,
          tooling: 15.00,
          finish: 10.00,
          inspection: 6.00,
          risk: 4.00,
          overhead: 25.60,
          margin: 19.20
        }
      },
      diff: {
        unit_price: 0.56,
        total_price: 28.00,
        breakdown: {
          setup: 5.00,
          machine_time: 10.20,
          material: 5.20,
          tooling: 2.50,
          finish: 1.25,
          inspection: 1.00,
          risk: 0.50,
          overhead: 3.20,
          margin: -0.80
        }
      }
    };
  }

  async applyPriceOverride(quoteId: string, overrides: any, reason: any) {
    // Mock override application
    return {
      success: true,
      override_id: `ovr_${Date.now()}`,
      quote_id: quoteId,
      applied_at: new Date().toISOString(),
      reason_code: reason.code,
      reason_text: reason.text,
      changes: overrides
    };
  }

  async acknowledgeDfmFinding(quoteId: string, findingId: string, note?: string) {
    // Mock DFM acknowledgement
    return {
      success: true,
      finding_id: findingId,
      ack: true,
      note: note,
      ack_by: 'user_jane',
      ack_at: new Date().toISOString()
    };
  }

  async annotateDfmFinding(quoteId: string, findingId: string, annotation: any) {
    // Mock annotation
    return {
      success: true,
      annotation_id: `ann_${Date.now()}`,
      finding_id: findingId,
      note: annotation.note,
      screenshot_url: annotation.screenshot ? 'screenshot_001.jpg' : null,
      created_at: new Date().toISOString()
    };
  }

  async requestChanges(quoteId: string, request: any) {
    // Mock change request
    return {
      success: true,
      request_id: `req_${Date.now()}`,
      quote_id: quoteId,
      to: request.to,
      message: request.message,
      findings: request.include_findings,
      pdf_attached: request.attach_pdf,
      sent_at: new Date().toISOString()
    };
  }

  async addNote(quoteId: string, note: any) {
    // Mock note addition
    return {
      success: true,
      note_id: `note_${Date.now()}`,
      quote_id: quoteId,
      content: note.content,
      mentions: note.mentions || [],
      attachments: note.attachments || [],
      created_at: new Date().toISOString()
    };
  }
}
