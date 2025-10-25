/**
 * Step 16: Revision Writer Service
 * Handles automatic revision creation on pricing changes
 */

import { Injectable, Logger } from '@nestjs/common';
import { RevisionsService } from './revisions.service';
import { generatePricingHash } from './pricing-hash.util';

export interface CreateRevisionInput {
  quote_id: string;
  org_id: string;
  user_id: string | null;
  event_type: 'user_update' | 'system_reprice' | 'tax_update' | 'restore' | 'initial';
  snapshot_json: any;
  note?: string;
  restored_from_revision_id?: string;
}

export interface QuoteSnapshot {
  quote: {
    header: {
      currency: string;
      lead_time_class?: string;
      expires_at?: string;
      customer_ref?: string;
      notes?: string;
    };
    config: {
      process?: string;
      material?: string;
      region?: string;
      quantity?: number;
      tolerances?: any;
      finishes?: any;
      risk_vector?: any;
    };
    lines: Array<{
      line_id: string;
      part_id?: string;
      inputs: any;
      outputs: any;
    }>;
  };
  capacity_hint?: any;
  tax_hint?: any;
}

@Injectable()
export class RevisionWriterService {
  private readonly logger = new Logger(RevisionWriterService.name);

  constructor(private readonly revisionsService: RevisionsService) {}

  async createRevisionIfChanged(input: CreateRevisionInput): Promise<string | null> {
    const { quote_id, snapshot_json } = input;

    try {
      const newHash = generatePricingHash(snapshot_json);
      const shouldCreate = await this.revisionsService.shouldCreateRevision(
        quote_id,
        newHash,
      );

      if (!shouldCreate && input.event_type !== 'restore') {
        this.logger.debug(`Skipping revision for quote ${quote_id}`);
        return null;
      }

      const revision = await this.revisionsService.create({
        quote_id: input.quote_id,
        org_id: input.org_id,
        user_id: input.user_id,
        event_type: input.event_type,
        pricing_hash: newHash,
        snapshot_json: input.snapshot_json,
        note: input.note,
        restored_from_revision_id: input.restored_from_revision_id,
      });

      this.logger.log(`Created revision ${revision.id} for quote ${quote_id}`);
      return revision.id;
    } catch (error) {
      this.logger.error(`Failed to create revision for quote ${quote_id}:`, error);
      throw error;
    }
  }

  buildSnapshot(quote: any, pricingResult: any): any {
    return {
      quote: {
        header: {
          currency: quote.currency || 'USD',
          lead_time_class: quote.lead_time_class,
          expires_at: quote.expires_at,
          customer_ref: quote.customer_ref,
          notes: quote.notes,
        },
        config: {
          process: quote.process,
          material: quote.material,
          region: quote.region,
          quantity: quote.quantity,
          tolerances: quote.tolerances,
          finishes: quote.finishes,
          risk_vector: quote.risk_vector,
        },
        lines: pricingResult.lines?.map((line: any) => ({
          line_id: line.line_id || line.id,
          part_id: line.part_id,
          inputs: {
            process: line.process,
            material: line.material,
            qty: line.quantity,
            tolerances: line.tolerances,
            finishes: line.finishes,
            orientation: line.orientation,
          },
          outputs: {
            unit_price: line.unit_price,
            setup_cost: line.setup_cost,
            material_cost: line.material_cost,
            machine_time_min: line.machine_time_min,
            margin: line.margin,
            lead_days: line.lead_days,
            factor_breakdown: line.factor_breakdown,
          },
        })) || [],
      },
      capacity_hint: pricingResult.capacity_hint,
      tax_hint: pricingResult.tax_hint,
    };
  }

  async captureUserUpdate(
    quoteId: string,
    orgId: string,
    userId: string,
    snapshot: any,
    note?: string,
  ): Promise<string | null> {
    return this.createRevisionIfChanged({
      quote_id: quoteId,
      org_id: orgId,
      user_id: userId,
      event_type: 'user_update',
      snapshot_json: snapshot,
      note,
    });
  }

  async captureSystemReprice(
    quoteId: string,
    orgId: string,
    snapshot: any,
    note?: string,
  ): Promise<string | null> {
    return this.createRevisionIfChanged({
      quote_id: quoteId,
      org_id: orgId,
      user_id: null,
      event_type: 'system_reprice',
      snapshot_json: snapshot,
      note,
    });
  }

  async captureTaxUpdate(
    quoteId: string,
    orgId: string,
    snapshot: any,
    note?: string,
  ): Promise<string | null> {
    return this.createRevisionIfChanged({
      quote_id: quoteId,
      org_id: orgId,
      user_id: null,
      event_type: 'tax_update',
      snapshot_json: snapshot,
      note,
    });
  }
}
