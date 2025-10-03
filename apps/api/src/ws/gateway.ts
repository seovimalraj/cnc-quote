/**
 * Step 18: WebSocket Gateway for Job Progress
 * Real-time job progress updates via WebSocket + HTTP endpoint for worker
 */

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';

/**
 * Redis subscriber for job progress events
 */
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const subscriber = new Redis(redisUrl);

const WORKER_SECRET = process.env.WORKER_SECRET || 'dev-secret-change-in-prod';

/**
 * Job progress payload (from worker)
 */
interface ProgressPayload {
  job_id: string;
  status: 'queued' | 'active' | 'progress' | 'completed' | 'failed' | 'stalled' | 'retrying' | 'cancelled';
  progress?: number; // 0-100
  message?: string;
  meta?: Record<string, any>;
  trace_id?: string;
  error?: string;
  result?: any;
}

/**
 * WebSocket Gateway for job progress
 */
@WebSocketGateway({ cors: true, namespace: '/jobs' })
export class JobsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private subscriptions = new Map<string, Set<string>>(); // org_id -> Set<job_id>

  constructor() {
    this.initRedisSubscriber();
  }

  /**
   * Initialize Redis pub/sub subscriber
   */
  private initRedisSubscriber() {
    subscriber.psubscribe('jobs:*', (err, count) => {
      if (err) {
        console.error('Failed to subscribe to Redis pattern:', err);
      } else {
        console.log(`Subscribed to ${count} Redis patterns`);
      }
    });

    subscriber.on('pmessage', (pattern, channel, message) => {
      try {
        // Channel format: jobs:${org_id}:${job_id}
        const parts = channel.split(':');
        if (parts.length === 3) {
          const org_id = parts[1];
          const job_id = parts[2];
          const payload: ProgressPayload = JSON.parse(message);

          // Emit to WebSocket room
          const room = `${org_id}:${job_id}`;
          this.server.to(room).emit('progress', payload);

          console.log(`Relayed job progress to room ${room}:`, payload.status);
        }
      } catch (error) {
        console.error('Error processing Redis message:', error);
      }
    });
  }

  /**
   * Client connection handler
   */
  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  /**
   * Client disconnection handler
   */
  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Subscribe to job updates
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    client: Socket,
    payload: { org_id: string; job_id: string },
  ) {
    const { org_id, job_id } = payload;

    if (!org_id || !job_id) {
      client.emit('error', { message: 'Missing org_id or job_id' });
      return;
    }

    const room = `${org_id}:${job_id}`;
    client.join(room);

    // Track subscription
    if (!this.subscriptions.has(org_id)) {
      this.subscriptions.set(org_id, new Set());
    }
    this.subscriptions.get(org_id)!.add(job_id);

    console.log(`Client ${client.id} subscribed to ${room}`);
    client.emit('subscribed', { org_id, job_id });
  }

  /**
   * Unsubscribe from job updates
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    client: Socket,
    payload: { org_id: string; job_id: string },
  ) {
    const { org_id, job_id } = payload;

    if (!org_id || !job_id) {
      return;
    }

    const room = `${org_id}:${job_id}`;
    client.leave(room);

    // Remove from tracking
    const subs = this.subscriptions.get(org_id);
    if (subs) {
      subs.delete(job_id);
      if (subs.size === 0) {
        this.subscriptions.delete(org_id);
      }
    }

    console.log(`Client ${client.id} unsubscribed from ${room}`);
  }
}

/**
 * HTTP Controller for worker to publish progress
 * Used as fallback when Redis pub/sub is not available
 */
@Controller('ws')
export class JobEventsController {
  constructor(private jobsGateway: JobsGateway) {}

  /**
   * POST /ws/job-events
   * Worker pushes job progress via HTTP
   */
  @Post('job-events')
  async publishJobEvent(
    @Headers('x-worker-secret') workerSecret: string,
    @Body() payload: ProgressPayload & { org_id: string },
  ) {
    // Verify worker secret
    if (workerSecret !== WORKER_SECRET) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const { org_id, job_id, status, progress, message, meta, trace_id, error, result } = payload;

    if (!org_id || !job_id) {
      throw new HttpException(
        'Missing required fields: org_id, job_id',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Emit to WebSocket room
    const room = `${org_id}:${job_id}`;
    this.jobsGateway.server.to(room).emit('progress', {
      job_id,
      status,
      progress,
      message,
      meta,
      trace_id,
      error,
      result,
    });

    return { ok: true };
  }
}
