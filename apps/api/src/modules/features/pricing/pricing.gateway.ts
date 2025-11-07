import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ContractsV1 } from '@cnc-quote/shared';
import { PricingEngineV2Service } from './pricing-engine-v2.service';
import { PricingPersistenceService } from './pricing-persistence.service';
import { diffPricingMatrix, computeSelectedSubtotalDelta } from './pricing-diff.util';
import { SupabaseService } from "../../../lib/supabase/supabase.service";

// Basic namespace for pricing & related realtime events
@WebSocketGateway({ namespace: '/ws/pricing', cors: { origin: '*' } })
export class PricingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(PricingGateway.name);
  private readonly connectedUsers = new Map<string, { user_id: string; org_id: string }>();
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>(); // key: quote_id
  private readonly pendingRecalc = new Map<string, Set<string>>(); // quote_id -> set of quote_item_ids needing recalculation
  private readonly optimisticTracker = new Map<string, number>(); // correlation_id -> start timestamp
  // Basic in-memory metrics (reset on process restart)
  private metrics = {
    total_flushes: 0,
    total_items_recalculated: 0,
    total_optimistic_events: 0,
    total_final_events: 0,
    total_latency_ms: 0,
    max_latency_ms: 0,
  };

  constructor(
    private readonly pricingEngine: PricingEngineV2Service,
    private readonly supabase: SupabaseService,
    private readonly pricingPersistence: PricingPersistenceService,
  ) {}

  handleConnection(client: Socket) {
    const rawAuth = client.handshake.auth?.token || client.handshake.headers['authorization'];
    const token = typeof rawAuth === 'string' && rawAuth.startsWith('Bearer ') ? rawAuth.slice(7) : rawAuth;
    if (!token) {
      this.logger.warn(`No auth token for socket ${client.id}`);
      client.emit('error', { message: 'unauthorized' });
      client.disconnect();
      return;
    }
    try {
      // For now allow unsigned dev tokens if JWT_SECRET absent (dev mode)
      let decoded: any;
      if (process.env.JWT_SECRET) {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } else {
        // Attempt decode without verification (DO NOT use in prod without secret)
        decoded = jwt.decode(token) || {};
      }
      const user_id = decoded.sub || decoded.user_id || decoded.id;
      const org_id = decoded.org_id || decoded.organization_id || decoded.org;
      if (!user_id || !org_id) {
        this.logger.warn(`Missing claims user/org in token for socket ${client.id}`);
        client.emit('error', { message: 'forbidden' });
        client.disconnect();
        return;
      }
      this.connectedUsers.set(client.id, { user_id, org_id });
      this.logger.log(`Client connected ${client.id} user=${user_id} org=${org_id}`);
    } catch (err: any) {
      this.logger.warn(`JWT verify failed for socket ${client.id}: ${err.message}`);
      client.emit('error', { message: 'unauthorized' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedUsers.delete(client.id);
    this.logger.log(`Client disconnected ${client.id}`);
  }

  // Client requests to join a quote room
  @SubscribeMessage('join_quote')
  async handleJoinQuote(
    @MessageBody() data: { quote_id: string },
    @ConnectedSocket() client: Socket
  ) {
    if (!data?.quote_id) {
      client.emit('error', { message: 'quote_id required' });
      return;
    }
    const claims = this.connectedUsers.get(client.id);
    if (!claims) {
      client.emit('error', { message: 'unauthorized' });
      return;
    }
    const allowed = await this.userCanAccessQuote(claims.org_id, data.quote_id);
    if (!allowed) {
      client.emit('error', { message: 'forbidden' });
      return;
    }
    client.join(this.roomName(data.quote_id));
    client.emit('joined', { quote_id: data.quote_id });
  }

  // Client requests pricing recalculation for specific items / config change
  @SubscribeMessage('recalculate_pricing')
  async handleRecalculate(
    @MessageBody() body: { quote_id: string; quote_item_id: string; config?: ContractsV1.PartConfigV1 },
    @ConnectedSocket() client: Socket
  ) {
    const claims = this.connectedUsers.get(client.id);
    if (!claims) {
      client.emit('error', { message: 'unauthorized' });
      return;
    }
    if (!body?.quote_id || !body?.quote_item_id) {
      client.emit('error', { message: 'quote_id and quote_item_id required' });
      return;
    }

    // Track requested item for batch processing
    if (!this.pendingRecalc.has(body.quote_id)) this.pendingRecalc.set(body.quote_id, new Set());
    this.pendingRecalc.get(body.quote_id)!.add(body.quote_item_id);

    // Emit optimistic placeholder event for this specific item immediately
    const correlationId = `${body.quote_item_id}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    this.optimisticTracker.set(correlationId, Date.now());
    const optimistic: ContractsV1.PricingOptimisticEventV1 = {
      version: 'v1',
      kind: 'pricing:optimistic',
      quote_id: body.quote_id,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      payload: {
        quote_item_id: body.quote_item_id,
        matrix_patches: [
          { quantity: body.config?.selected_quantity || 1, status: 'optimistic' }
        ],
        pricing_version: Date.now(),
        optimistic: true
      }
    };
    this.broadcastPricingEvent(optimistic);
  this.metrics.total_optimistic_events += 1;

    // Debounce batch execution per quote
    if (this.debounceTimers.has(body.quote_id)) {
      const t = this.debounceTimers.get(body.quote_id);
      if (t) clearTimeout(t);
    }
    this.debounceTimers.set(body.quote_id, setTimeout(() => {
      this.flushRecalculations(body.quote_id).catch(err => {
        this.logger.error(`Flush recalculation failed: ${err.message}`);
      });
    }, 250));
  }

  // Broadcast helper for pricing events
  broadcastPricingEvent(event: ContractsV1.PricingUpdateEventV1 | ContractsV1.PricingOptimisticEventV1) {
    const room = this.roomName(event.quote_id);
    this.server.to(room).emit('pricing_event', event);
  }

  // Broadcast helper for geometry events
  broadcastGeometryEvent(event: ContractsV1.GeometryUpdateEventV1 | ContractsV1.GeometryErrorEventV1) {
    const room = this.roomName(event.quote_id);
    this.server.to(room).emit('geometry_event', event);
  }

  // Broadcast helper for DFM events
  broadcastDfmEvent(event: ContractsV1.DfmUpdateEventV1 | ContractsV1.DfmPartialEventV1 | ContractsV1.DfmErrorEventV1) {
    const room = this.roomName(event.quote_id);
    this.server.to(room).emit('dfm_event', event);
  }

  private roomName(quoteId: string) {
    return `quote_${quoteId}`;
  }

  private async userCanAccessQuote(orgId: string, quoteId: string): Promise<boolean> {
    const { data, error } = await this.supabase.client
      .from('quotes')
      .select('id')
      .eq('id', quoteId)
      .eq('org_id', orgId)
      .single();
    if (error) return false;
    return !!data;
  }

  private async flushRecalculations(quoteId: string) {
    const itemSet = this.pendingRecalc.get(quoteId);
    if (!itemSet || itemSet.size === 0) return;
    this.pendingRecalc.delete(quoteId);
    const itemIds = Array.from(itemSet);
    const startedAt = Date.now();
    let emittedPatches = 0;

    // Fetch previous matrices & configs once
    const { data: prevItemsData, error: prevErr } = await this.supabase.client
      .from('quote_items')
      .select('id, pricing_matrix, config_json')
      .eq('quote_id', quoteId);
    if (prevErr) throw prevErr;
    const prevItems = (prevItemsData || []).map(r => ({
      id: r.id,
      matrix: (r.pricing_matrix || []) as any[],
      selected_quantity: r.config_json?.selected_quantity
    }));

    for (const quote_item_id of itemIds) {
      try {
        const partConfig = (prevItemsData || []).find(r => r.id === quote_item_id)?.config_json as ContractsV1.PartConfigV1;
        if (!partConfig) continue;
        const quantities = partConfig.quantities?.length ? partConfig.quantities : [partConfig.selected_quantity || 1];
        const engineResp = await this.pricingEngine.calculatePricing({
          part_config: partConfig as any,
          geometry: undefined,
          quantities
        } as any);
        const pricingMatrix = engineResp.pricing_matrix as any[];
        const prevForItem = prevItems.find(i => i.id === quote_item_id)?.matrix || [];

        await this.pricingPersistence.persistMatrixAndTotals({
            quote_id: quoteId,
            quote_item_id,
      matrix: pricingMatrix as any,
      partConfig,
      traceId: `pricing-realtime:${quoteId}:${quote_item_id}:${Date.now()}`,
        });
        const patches = diffPricingMatrix(prevForItem as any, pricingMatrix as any);
        const subtotalDelta = computeSelectedSubtotalDelta({
          prevItems,
          updatedItemId: quote_item_id,
          newMatrix: pricingMatrix as any,
          newSelectedQuantity: partConfig.selected_quantity
        });
        const selectedRow = pricingMatrix.find(r => r.quantity === partConfig.selected_quantity) || pricingMatrix[0];
        const correlationEntry = Array.from(this.optimisticTracker.entries()).find(([cid]) => cid.startsWith(`${quote_item_id}-`));
        const correlation_id = correlationEntry?.[0];
        let latency_ms: number | undefined;
        if (correlation_id) {
          const started = this.optimisticTracker.get(correlation_id)!;
            latency_ms = Date.now() - started;
          this.optimisticTracker.delete(correlation_id);
          this.metrics.total_latency_ms += latency_ms;
          if (latency_ms > this.metrics.max_latency_ms) this.metrics.max_latency_ms = latency_ms;
        }
        const finalEvt: ContractsV1.PricingUpdateEventV1 = {
          version: 'v1',
            kind: 'pricing:update',
            quote_id: quoteId,
            timestamp: new Date().toISOString(),
            correlation_id,
            payload: {
              quote_item_id,
              matrix_patches: patches.length ? patches : [
                {
                  quantity: selectedRow.quantity,
                  unit_price: selectedRow.unit_price,
                  total_price: selectedRow.total_price,
                  lead_time_days: selectedRow.lead_time_days,
                  breakdown: selectedRow.breakdown,
                  status: 'ready',
                  compliance: selectedRow.compliance ?? null,
                }
              ],
              pricing_version: Date.now(),
              subtotal_delta: subtotalDelta,
              optimistic: false,
              latency_ms
            }
        };
        this.broadcastPricingEvent(finalEvt);
        this.metrics.total_final_events += 1;
        emittedPatches += patches.length || 1;
      } catch (err: any) {
        this.logger.error(`Recalc failed for item ${quote_item_id}: ${err.message}`);
      }
    }
    const duration = Date.now() - startedAt;
    this.metrics.total_flushes += 1;
    this.metrics.total_items_recalculated += itemIds.length;
    const avgLatency = this.metrics.total_final_events
      ? Math.round(this.metrics.total_latency_ms / this.metrics.total_final_events)
      : 0;
    this.logger.log(
      JSON.stringify({
        evt: 'pricing_flush',
        quote_id: quoteId,
        items: itemIds.length,
        emitted_patches: emittedPatches,
        duration_ms: duration,
        totals: {
          flushes: this.metrics.total_flushes,
          items_recalced: this.metrics.total_items_recalculated,
          optimistic_events: this.metrics.total_optimistic_events,
          final_events: this.metrics.total_final_events,
          avg_latency_ms: avgLatency,
          max_latency_ms: this.metrics.max_latency_ms,
        }
      })
    );
  }
}
