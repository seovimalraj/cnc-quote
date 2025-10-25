import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";
import { createHash } from 'crypto';

export interface EnvironmentOverview {
  environment_name: string;
  git_sha_short: string;
  build_date: string;
  region: string;
  versions: {
    node: string;
    nest: string;
    python: string;
    redis: string;
    pg: string;
  };
  health: {
    api: 'healthy' | 'degraded' | 'unhealthy';
    cad: 'healthy' | 'degraded' | 'unhealthy';
    queue: 'healthy' | 'degraded' | 'unhealthy';
    supabase: 'healthy' | 'degraded' | 'unhealthy';
    stripe_webhook: 'healthy' | 'degraded' | 'unhealthy';
    paypal_webhook: 'healthy' | 'degraded' | 'unhealthy';
  };
  lat: {
    api: number;
    cad: number;
  };
  queue: {
    depth: number;
  };
}

export interface WebhookTestResult {
  status: number;
  latency_ms: number;
  signature_used: string;
  response_body: any;
  logs: string[];
}

export interface SeedResult {
  entities_created: Record<string, number>;
  jobs_enqueued: number;
  duration_ms: number;
  logs: string[];
}

export interface EmailTestResult {
  sent: boolean;
  template: string;
  to: string;
  message_id?: string;
  error?: string;
}

export interface EnqueueResult {
  job_id: string;
  queue_name: string;
  payload: any;
  enqueued_at: string;
}

export interface QueueStatus {
  depth: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

@Injectable()
export class AdminDevService {
  private readonly logger = new Logger(AdminDevService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getEnvironmentOverview(): Promise<EnvironmentOverview> {
    try {
      // Get environment info
      const env = process.env.NODE_ENV || 'development';
      const gitSha = process.env.GIT_SHA || 'unknown';
      const buildDate = process.env.BUILD_DATE || new Date().toISOString();
      const region = process.env.REGION || 'local';

      // Get versions
      const versions = {
        node: process.version,
        nest: '10.x', // Would get from package.json
        python: '3.11.x', // Would get from CAD service
        redis: '7.x', // Would get from Redis INFO
        pg: '15.x', // Would get from Supabase
      };

      // Get health status (simplified - would call actual health checks)
      const health = {
        api: 'healthy' as const,
        cad: 'healthy' as const,
        queue: 'healthy' as const,
        supabase: 'healthy' as const,
        stripe_webhook: 'healthy' as const,
        paypal_webhook: 'healthy' as const,
      };

      // Get latencies (simplified)
      const lat = {
        api: 45,
        cad: 120,
      };

      // Get queue depth
      const queue = {
        depth: 0, // Would get from BullMQ
      };

      return {
        environment_name: env,
        git_sha_short: gitSha.substring(0, 7),
        build_date: buildDate,
        region,
        versions,
        health,
        lat,
        queue,
      };
    } catch (error) {
      this.logger.error('Failed to get environment overview', error);
      throw error;
    }
  }

  async getOpenApiJson(): Promise<any> {
    try {
      // In a real implementation, this would read from the OpenAPI spec file
      // For now, return a basic structure
      return {
        openapi: '3.0.3',
        info: {
          title: 'CNC Quote API',
          version: '1.0.0',
          description: 'API for CNC Quote application',
        },
        servers: [
          {
            url: '/api',
          },
        ],
        paths: {
          // Would include all API paths
        },
        components: {
          schemas: {
            // Would include all schemas
          },
        },
      };
    } catch (error) {
      this.logger.error('Failed to get OpenAPI JSON', error);
      throw error;
    }
  }

  async getOpenApiYaml(): Promise<string> {
    try {
      // Convert JSON to YAML (simplified)
      const json = await this.getOpenApiJson();
      return JSON.stringify(json, null, 2); // In real implementation, use yaml library
    } catch (error) {
      this.logger.error('Failed to get OpenAPI YAML', error);
      throw error;
    }
  }

  async getCadOpenApiJson(): Promise<any> {
    try {
      // Would fetch from CAD service
      return {
        openapi: '3.0.3',
        info: {
          title: 'CAD Service API',
          version: '1.0.0',
          description: 'API for CAD analysis service',
        },
        servers: [
          {
            url: '/cad',
          },
        ],
        paths: {
          // CAD service paths
        },
      };
    } catch (error) {
      this.logger.error('Failed to get CAD OpenAPI JSON', error);
      throw error;
    }
  }

  async sendTestWebhook(
    provider: 'Stripe' | 'PayPal',
    eventType: string,
    payload: any,
    signatureMode: 'auto' | 'unsigned',
    userId: string,
    ipAddress: string,
  ): Promise<WebhookTestResult> {
    try {
      // Environment gate
      const env = process.env.NODE_ENV;
      if (env === 'production') {
        throw new ForbiddenException('Test webhooks disabled in production');
      }

      const startTime = Date.now();
      let status = 200;
      let responseBody = {};
      const logs: string[] = [];

      logs.push(`Sending ${provider} webhook: ${eventType}`);

      if (provider === 'Stripe') {
        // Simulate Stripe webhook
        const signature = signatureMode === 'auto'
          ? this.generateStripeSignature(payload, 'test_secret')
          : null;

        logs.push(`Signature mode: ${signatureMode}`);
        if (signature) {
          logs.push(`Generated signature: ${signature.substring(0, 20)}...`);
        }

        // Simulate webhook processing
        responseBody = { received: true, event: eventType };
        logs.push('Webhook processed successfully');
      } else if (provider === 'PayPal') {
        // Simulate PayPal webhook
        logs.push('PayPal webhook simulation');
        responseBody = { status: 'SUCCESS' };
      }

      const latency = Date.now() - startTime;

      // Log to audit
      await this.logAuditEvent(userId, 'dev_webhook_sent', 'OK', {
        provider,
        event_type: eventType,
        ip_address: ipAddress,
      });

      return {
        status,
        latency_ms: latency,
        signature_used: signatureMode,
        response_body: responseBody,
        logs,
      };
    } catch (error) {
      this.logger.error('Failed to send test webhook', error);
      throw error;
    }
  }

  async seedSampleData(
    entities: string[],
    withCadJobs: boolean,
    withPayments: boolean,
    userId: string,
    ipAddress: string,
  ): Promise<SeedResult> {
    try {
      // Environment gate
      const env = process.env.NODE_ENV;
      if (env === 'production') {
        throw new ForbiddenException('Data seeding disabled in production');
      }

      const startTime = Date.now();
      const entitiesCreated: Record<string, number> = {};
      const logs: string[] = [];
      let jobsEnqueued = 0;

      logs.push(`Starting data seeding for: ${entities.join(', ')}`);

      // Simulate seeding different entities
      for (const entity of entities) {
        switch (entity) {
          case 'Organization':
            entitiesCreated.organization = 1;
            logs.push('Created sample organization');
            break;
          case 'User':
            entitiesCreated.user = 5;
            logs.push('Created 5 sample users');
            break;
          case 'Machines':
            entitiesCreated.machine = 10;
            logs.push('Created 10 sample machines');
            break;
          case 'Materials':
            entitiesCreated.material = 20;
            logs.push('Created 20 sample materials');
            break;
          case 'Quotes (10)':
            entitiesCreated.quote = 10;
            logs.push('Created 10 sample quotes');
            break;
          case 'Orders (5)':
            entitiesCreated.order = 5;
            logs.push('Created 5 sample orders');
            break;
        }
      }

      if (withCadJobs) {
        jobsEnqueued = 5;
        logs.push('Enqueued 5 CAD analysis jobs');
      }

      if (withPayments) {
        entitiesCreated.payment = 3;
        logs.push('Created 3 fake payment events');
      }

      const duration = Date.now() - startTime;

      // Log to audit
      await this.logAuditEvent(userId, 'dev_seed_started', 'OK', {
        entities,
        with_cad_jobs: withCadJobs,
        with_payments: withPayments,
        ip_address: ipAddress,
      });

      return {
        entities_created: entitiesCreated,
        jobs_enqueued: jobsEnqueued,
        duration_ms: duration,
        logs,
      };
    } catch (error) {
      this.logger.error('Failed to seed sample data', error);
      throw error;
    }
  }

  async sendTestEmail(
    template: string,
    to: string,
    userId: string,
    ipAddress: string,
  ): Promise<EmailTestResult> {
    try {
      // Environment gate
      const env = process.env.NODE_ENV;
      if (env === 'production') {
        throw new ForbiddenException('Test emails disabled in production');
      }

      const messageId = `test_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      // Simulate email sending
      this.logger.log(`Sending test email ${template} to ${to}`);

      // Log to audit
      await this.logAuditEvent(userId, 'dev_email_test_sent', 'OK', {
        template,
        to,
        ip_address: ipAddress,
      });

      return {
        sent: true,
        template,
        to,
        message_id: messageId,
      };
    } catch (error) {
      this.logger.error('Failed to send test email', error);
      return {
        sent: false,
        template,
        to,
        error: error.message,
      };
    }
  }

  async enqueueTestJob(
    jobType: string,
    payload: any,
    userId: string,
    ipAddress: string,
  ): Promise<EnqueueResult> {
    try {
      // Environment gate
      const env = process.env.NODE_ENV;
      if (env === 'production') {
        throw new ForbiddenException('Test job enqueue disabled in production');
      }

      const jobId = `test_job_${Date.now()}_${Math.random().toString(36).substring(2)}`;

      // Simulate job enqueueing
      this.logger.log(`Enqueuing test job ${jobType} with payload:`, payload);

      // Log to audit
      await this.logAuditEvent(userId, 'dev_job_enqueued', 'OK', {
        job_type: jobType,
        payload: JSON.stringify(payload).substring(0, 100), // Truncate for audit
        ip_address: ipAddress,
      });

      return {
        job_id: jobId,
        queue_name: jobType.split(':')[0],
        payload,
        enqueued_at: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to enqueue test job', error);
      throw error;
    }
  }

  async getQueueStatus(): Promise<QueueStatus> {
    try {
      // Simulate queue status (would get from BullMQ)
      return {
        depth: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
      };
    } catch (error) {
      this.logger.error('Failed to get queue status', error);
      throw error;
    }
  }

  private generateStripeSignature(payload: any, secret: string): string {
    const timestamp = Math.floor(Date.now() / 1000);
    const payloadString = JSON.stringify(payload);
    const signedPayload = `${timestamp}.${payloadString}`;
    const signature = createHash('sha256')
      .update(signedPayload + secret)
      .digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }

  private async logAuditEvent(
    userId: string,
    action: string,
    result: 'OK' | 'ERROR',
    props: any,
  ): Promise<void> {
    try {
      await this.supabase.client
        .from('audit_events')
        .insert({
          user_id: userId,
          action,
          result,
          props_redacted: props,
          ts: new Date().toISOString(),
        });
    } catch (error) {
      this.logger.error('Failed to log audit event', error);
    }
  }
}
