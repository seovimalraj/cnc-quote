import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from "../auth/jwt.guard";
import { PricingEngineV2Service, PricingEngineRequest } from './pricing-engine-v2.service';
import { GeometryService } from "../geometry/geometry.service";
import type { ContractsV1 } from '@cnc-quote/shared';

interface PricingRequest {
  quote_id: string;
  quote_item_id: string;
  part_config: ContractsV1.PartConfigV1;
  geometry_data?: any;
}

interface PricingResponse {
  quote_item_id: string;
  pricing: any;
  timestamp: string;
  calculation_time_ms: number;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/pricing',
})
@UseGuards(JwtAuthGuard)
export class PricingWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PricingWebSocketGateway.name);
  private connectedClients = new Map<string, { socket: Socket; user_id: string; org_id: string }>();
  private subscriptions = new Map<string, Set<string>>(); // quote_id -> client_ids

  constructor(
    private readonly pricingService: PricingEngineV2Service,
    private readonly geometryService: GeometryService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract user info from JWT token (simplified)
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      // TODO: Proper JWT validation here
      const userId = 'user_123'; // Extract from JWT
      const orgId = 'org_456';   // Extract from JWT

      this.connectedClients.set(client.id, {
        socket: client,
        user_id: userId,
        org_id: orgId,
      });

      this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.connectedClients.get(client.id);
    if (clientInfo) {
      // Remove from all subscriptions
      for (const [quoteId, subscribers] of this.subscriptions.entries()) {
        subscribers.delete(client.id);
        if (subscribers.size === 0) {
          this.subscriptions.delete(quoteId);
        }
      }

      this.connectedClients.delete(client.id);
      this.logger.log(`Client disconnected: ${client.id}`);
    }
  }

  @SubscribeMessage('subscribe_quote')
  async subscribeToQuote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quote_id: string }
  ) {
    const { quote_id } = data;
    
    if (!this.subscriptions.has(quote_id)) {
      this.subscriptions.set(quote_id, new Set());
    }
    
    this.subscriptions.get(quote_id).add(client.id);
    
    this.logger.log(`Client ${client.id} subscribed to quote ${quote_id}`);
    
    client.emit('subscription_confirmed', { quote_id });
  }

  @SubscribeMessage('unsubscribe_quote')
  async unsubscribeFromQuote(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { quote_id: string }
  ) {
    const { quote_id } = data;
    
    if (this.subscriptions.has(quote_id)) {
      this.subscriptions.get(quote_id).delete(client.id);
      
      if (this.subscriptions.get(quote_id).size === 0) {
        this.subscriptions.delete(quote_id);
      }
    }
    
    this.logger.log(`Client ${client.id} unsubscribed from quote ${quote_id}`);
    
    client.emit('unsubscription_confirmed', { quote_id });
  }

  @SubscribeMessage('calculate_pricing')
  async calculatePricing(
    @ConnectedSocket() client: Socket,
    @MessageBody() request: PricingRequest
  ) {
    const startTime = Date.now();
    
    try {
      this.logger.log(`Calculating pricing for quote item ${request.quote_item_id}`);
      
      // Get geometry data if available
      let geometryData = request.geometry_data;
      if (!geometryData && request.part_config.file_id) {
        try {
          const analysisRequest = {
            file_id: request.part_config.file_id,
            file_path: '', // Will be resolved by CAD service
          };
          const analysis = await this.geometryService.analyzeGeometrySync(analysisRequest);
          geometryData = analysis.metrics;
        } catch (error) {
          this.logger.warn(`Failed to get geometry data: ${error.message}`);
        }
      }

      // Calculate pricing using the v2 engine
      const pricingRequest: PricingEngineRequest = {
        part_config: request.part_config,
        geometry: geometryData,
        quantities: [1], // Default to quantity of 1 for real-time pricing
      };
      const pricingResponse = await this.pricingService.calculatePricing(pricingRequest);
      const pricing = pricingResponse.pricing_matrix[0]; // Get first (only) quantity pricing

      const calculationTime = Date.now() - startTime;
      
      const response: PricingResponse = {
        quote_item_id: request.quote_item_id,
        pricing,
        timestamp: new Date().toISOString(),
        calculation_time_ms: calculationTime,
      };

      // Send response back to requesting client
      client.emit('pricing_calculated', response);

      // Broadcast to all subscribers of this quote (if different from requester)
      this.broadcastToQuoteSubscribers(request.quote_id, 'pricing_updated', response, client.id);

      this.logger.log(`Pricing calculated for quote item ${request.quote_item_id} in ${calculationTime}ms`);
      
    } catch (error) {
      this.logger.error(`Pricing calculation failed: ${error.message}`);
      
      client.emit('pricing_error', {
        quote_item_id: request.quote_item_id,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('batch_calculate_pricing')
  async batchCalculatePricing(
    @ConnectedSocket() client: Socket,
    @MessageBody() requests: PricingRequest[]
  ) {
    const startTime = Date.now();
    const results: PricingResponse[] = [];
    
    try {
      this.logger.log(`Batch calculating pricing for ${requests.length} items`);
      
      // Process requests in parallel (with concurrency limit)
      const BATCH_SIZE = 5;
      for (let i = 0; i < requests.length; i += BATCH_SIZE) {
        const batch = requests.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (request) => {
          try {
            let geometryData = request.geometry_data;
            if (!geometryData && request.part_config.file_id) {
              const analysisRequest = {
                file_id: request.part_config.file_id,
                file_path: '',
              };
              const analysis = await this.geometryService.analyzeGeometrySync(analysisRequest);
              geometryData = analysis.metrics;
            }

            const pricingRequest: PricingEngineRequest = {
              part_config: request.part_config,
              geometry: geometryData,
              quantities: [1],
            };
            const pricingResponse = await this.pricingService.calculatePricing(pricingRequest);
            const pricing = pricingResponse.pricing_matrix[0];

            return {
              quote_item_id: request.quote_item_id,
              pricing,
              timestamp: new Date().toISOString(),
              calculation_time_ms: Date.now() - startTime,
            };
          } catch (error) {
            this.logger.error(`Batch item ${request.quote_item_id} failed: ${error.message}`);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(Boolean));
        
        // Send partial results
        client.emit('batch_pricing_progress', {
          completed: results.length,
          total: requests.length,
          results: batchResults.filter(Boolean),
        });
      }

      const totalTime = Date.now() - startTime;
      
      client.emit('batch_pricing_complete', {
        results,
        total_time_ms: totalTime,
        successful: results.length,
        failed: requests.length - results.length,
      });

      this.logger.log(`Batch pricing completed: ${results.length}/${requests.length} successful in ${totalTime}ms`);
      
    } catch (error) {
      this.logger.error(`Batch pricing calculation failed: ${error.message}`);
      
      client.emit('batch_pricing_error', {
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Broadcast message to all subscribers of a quote (except sender)
   */
  private broadcastToQuoteSubscribers(
    quoteId: string,
    event: string,
    data: any,
    excludeClientId?: string
  ) {
    const subscribers = this.subscriptions.get(quoteId);
    if (!subscribers) return;

    for (const clientId of subscribers) {
      if (clientId !== excludeClientId) {
        const clientInfo = this.connectedClients.get(clientId);
        if (clientInfo) {
          clientInfo.socket.emit(event, data);
        }
      }
    }
  }

  /**
   * Trigger pricing recalculation for all items in a quote
   */
  async recalculateQuoteItems(quoteId: string, quoteItems: any[]) {
    const requests: PricingRequest[] = quoteItems.map(item => ({
      quote_id: quoteId,
      quote_item_id: item.id,
      part_config: item.part_config,
      geometry_data: item.geometry_data,
    }));

    const results: PricingResponse[] = [];
    
    for (const request of requests) {
      try {
        const pricingRequest: PricingEngineRequest = {
          part_config: request.part_config,
          geometry: request.geometry_data,
          quantities: [1],
        };
        const pricingResponse = await this.pricingService.calculatePricing(pricingRequest);
        const pricing = pricingResponse.pricing_matrix[0];

        const result: PricingResponse = {
          quote_item_id: request.quote_item_id,
          pricing,
          timestamp: new Date().toISOString(),
          calculation_time_ms: 0, // Not tracking individual times here
        };

        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to recalculate pricing for item ${request.quote_item_id}: ${error.message}`);
      }
    }

    // Broadcast results to all subscribers
    this.broadcastToQuoteSubscribers(quoteId, 'quote_pricing_updated', {
      quote_id: quoteId,
      updated_items: results,
      timestamp: new Date().toISOString(),
    });

    return results;
  }

  /**
   * Send real-time pricing updates for configuration changes
   */
  @SubscribeMessage('update_part_config')
  async updatePartConfig(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      quote_id: string;
      quote_item_id: string;
      part_config: ContractsV1.PartConfigV1;
      geometry_data?: any;
    }
  ) {
    try {
      this.logger.log(`Real-time config update for quote item ${data.quote_item_id}`);

      // Calculate new pricing immediately
      const startTime = Date.now();
      const pricingRequest: PricingEngineRequest = {
        part_config: data.part_config,
        geometry: data.geometry_data,
        quantities: [1],
      };
      const pricingResponse = await this.pricingService.calculatePricing(pricingRequest);
      const pricing = pricingResponse.pricing_matrix[0];
      const calculationTime = Date.now() - startTime;

      const response: PricingResponse = {
        quote_item_id: data.quote_item_id,
        pricing,
        timestamp: new Date().toISOString(),
        calculation_time_ms: calculationTime,
      };

      // Send immediate response to requesting client
      client.emit('pricing_updated', response);

      // Broadcast to other subscribers with a slight delay to prevent spam
      setTimeout(() => {
        this.broadcastToQuoteSubscribers(data.quote_id, 'pricing_updated', response, client.id);
      }, 100);

      this.logger.log(`Real-time pricing updated for ${data.quote_item_id} in ${calculationTime}ms`);

    } catch (error) {
      this.logger.error(`Real-time pricing update failed: ${error.message}`);
      client.emit('pricing_error', {
        quote_item_id: data.quote_item_id,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Handle bulk configuration updates with debounced pricing
   */
  @SubscribeMessage('bulk_update_configs')
  async bulkUpdateConfigs(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      quote_id: string;
      updates: Array<{
        quote_item_id: string;
        part_config: ContractsV1.PartConfigV1;
        geometry_data?: any;
      }>;
    }
  ) {
    try {
      this.logger.log(`Bulk config update for ${data.updates.length} items in quote ${data.quote_id}`);

      const startTime = Date.now();
      const results: PricingResponse[] = [];

      // Process updates in parallel with concurrency control
      const CONCURRENCY_LIMIT = 3;
      for (let i = 0; i < data.updates.length; i += CONCURRENCY_LIMIT) {
        const batch = data.updates.slice(i, i + CONCURRENCY_LIMIT);
        
        const batchPromises = batch.map(async (update) => {
          const itemStartTime = Date.now();
          try {
            const pricingRequest: PricingEngineRequest = {
              part_config: update.part_config,
              geometry: update.geometry_data,
              quantities: [1],
            };
            const pricingResponse = await this.pricingService.calculatePricing(pricingRequest);
            const pricing = pricingResponse.pricing_matrix[0];

            return {
              quote_item_id: update.quote_item_id,
              pricing,
              timestamp: new Date().toISOString(),
              calculation_time_ms: Date.now() - itemStartTime,
            };
          } catch (error) {
            this.logger.error(`Bulk update failed for ${update.quote_item_id}: ${error.message}`);
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(Boolean));

        // Send progress updates
        client.emit('bulk_update_progress', {
          completed: results.length,
          total: data.updates.length,
          latest_results: batchResults.filter(Boolean),
        });
      }

      const totalTime = Date.now() - startTime;

      // Send final results
      client.emit('bulk_update_complete', {
        quote_id: data.quote_id,
        results,
        total_time_ms: totalTime,
      });

      // Broadcast to other subscribers
      this.broadcastToQuoteSubscribers(data.quote_id, 'bulk_pricing_updated', {
        quote_id: data.quote_id,
        updated_items: results,
        timestamp: new Date().toISOString(),
      }, client.id);

      this.logger.log(`Bulk pricing update completed for ${data.quote_id}: ${results.length}/${data.updates.length} successful in ${totalTime}ms`);

    } catch (error) {
      this.logger.error(`Bulk config update failed: ${error.message}`);
      client.emit('bulk_update_error', {
        quote_id: data.quote_id,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}