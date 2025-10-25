import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server } from 'socket.io';
import { QueueMonitorService } from './queue-monitor.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { JwtService } from '@nestjs/jwt';

// Basic namespace for queue monitoring status
@WebSocketGateway({ namespace: '/ws/queues', cors: { origin: '*'} })
export class QueueStatusGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger(QueueStatusGateway.name);
  private interval?: NodeJS.Timeout;

  constructor(
    private readonly queueMonitor: QueueMonitorService,
  ) {}

  afterInit() {
    this.logger.log('QueueStatusGateway initialized');
    // Start periodic broadcast
    this.interval = setInterval(async () => {
      try {
        const status = await this.queueMonitor.getQueueStatus('5m');
        this.server.emit('queue.snapshot', {
          ts: Date.now(),
          ...status,
        });
      } catch (e) {
        this.logger.error('Failed broadcasting queue status', e instanceof Error ? e.stack : String(e));
      }
    }, 2000);
  }

  handleConnection(socket: any) {
    this.logger.debug(`Client connected ${socket.id}`);
  }

  handleDisconnect(socket: any) {
    this.logger.debug(`Client disconnected ${socket.id}`);
    if (this.server.engine.clientsCount === 0 && this.interval) {
      // Optionally pause updates when no clients
    }
  }
}
