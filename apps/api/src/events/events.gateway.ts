/**
 * Step 17: Events Gateway
 * WebSocket gateway for real-time order routing events
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface JoinChannelDto {
  channel: string;
}

interface OrderRoutedEvent {
  orderId: string;
  supplierId: string;
  supplierName: string;
  routedAt: string;
  routedBy: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.WEB_URL || 'http://localhost:3000',
    credentials: true,
  },
  path: '/api/socket.io',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join')
  handleJoinChannel(client: Socket, payload: JoinChannelDto) {
    const { channel } = payload;
    this.logger.log(`Client ${client.id} joining channel: ${channel}`);
    client.join(channel);
    return { event: 'joined', data: { channel } };
  }

  @SubscribeMessage('leave')
  handleLeaveChannel(client: Socket, payload: JoinChannelDto) {
    const { channel } = payload;
    this.logger.log(`Client ${client.id} leaving channel: ${channel}`);
    client.leave(channel);
    return { event: 'left', data: { channel } };
  }

  /**
   * Emit ORDER_ROUTED event to all clients in 'orders' channel
   */
  emitOrderRouted(event: OrderRoutedEvent) {
    this.logger.log(`Emitting ORDER_ROUTED: ${event.orderId} -> ${event.supplierName}`);
    this.server.to('orders').emit('ORDER_ROUTED', event);
  }

  /**
   * Emit ORDER_STATUS_CHANGED event (future use)
   */
  emitOrderStatusChanged(orderId: string, status: string) {
    this.logger.log(`Emitting ORDER_STATUS_CHANGED: ${orderId} -> ${status}`);
    this.server.to('orders').emit('ORDER_STATUS_CHANGED', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
    });
  }
}
