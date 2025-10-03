import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { ContractsV1 } from '@cnc-quote/shared';

@Injectable()
export class PricingPersistenceService {
  private readonly logger = new Logger(PricingPersistenceService.name);
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Persist a new pricing matrix for a single quote item and recompute quote totals.
   * NOTE: Supabase JS client does not expose multi-statement transactions directly;
   * for now we do sequential ops with a risk window. Future: move to RPC or server function.
   */
  async persistMatrixAndTotals(params: {
    quote_id: string;
    quote_item_id: string;
    matrix: ContractsV1.PricingBreakdownV1[];
  }): Promise<{ subtotal: number; total: number; pricing_version: number }> {
    const { quote_id, quote_item_id, matrix } = params;
    const pricing_version = Date.now();

    // 1. Update item matrix & version
    const { error: itemErr } = await this.supabase.client
      .from('quote_items')
      .update({ pricing_matrix: matrix, pricing_version, updated_at: new Date().toISOString() })
      .eq('id', quote_item_id);
    if (itemErr) throw itemErr;

    // 2. Fetch all item selected prices (simplified: first or matching selected_quantity if config exists)
    const { data: items, error: itemsErr } = await this.supabase.client
      .from('quote_items')
      .select('id, pricing_matrix, config_json')
      .eq('quote_id', quote_id);
    if (itemsErr) throw itemsErr;

    let subtotal = 0;
    for (const item of items || []) {
      const matrixVal: ContractsV1.PricingBreakdownV1[] = item.pricing_matrix || [];
      let selected = matrixVal[0];
      const selectedQty = item.config_json?.selected_quantity;
      if (selectedQty) {
        const match = matrixVal.find(m => m.quantity === selectedQty);
        if (match) selected = match;
      }
      subtotal += selected?.total_price || 0;
    }

    // 3. Update quote with new subtotal/total (no tax/shipping yet)
    const { error: quoteErr } = await this.supabase.client
      .from('quotes')
      .update({ subtotal, total_amount: subtotal, updated_at: new Date().toISOString() })
      .eq('id', quote_id);
    if (quoteErr) throw quoteErr;

    return { subtotal, total: subtotal, pricing_version };
  }
}
