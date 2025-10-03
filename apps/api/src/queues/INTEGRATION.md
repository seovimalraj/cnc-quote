/**
 * Step 18: Integration Checklist
 * Tasks to integrate the job queue system into the API
 */

## API Integration Steps

### 1. Import QueueModule in API's AppModule

**File**: `apps/api/src/app.module.ts`

```typescript
import { QueueModule } from './queues/queue.module';
import { JobsController } from './queues/jobs.controller';
import { JobsGateway, JobEventsController } from './ws/gateway';

@Module({
  imports: [
    // ... existing imports
    QueueModule,
  ],
  controllers: [
    // ... existing controllers
    JobsController,
    JobEventsController,
  ],
  providers: [
    // ... existing providers
    JobsGateway,
  ],
})
export class AppModule {}
```

### 2. Install Missing NestJS Dependencies

**File**: `apps/api/package.json`

Add if not already present:
```json
{
  "dependencies": {
    "@nestjs/websockets": "^10.0.0",
    "@nestjs/platform-socket.io": "^10.0.0",
    "socket.io": "^4.7.0",
    "bullmq": "^5.31.1",
    "ioredis": "^5.4.1"
  },
  "devDependencies": {
    "@types/socket.io": "^3.0.0"
  }
}
```

Then run:
```bash
cd apps/api
pnpm install
```

### 3. Update Environment Variables

**File**: `apps/api/.env`

Add:
```bash
WORKER_SECRET=your-secret-here-change-in-prod
```

### 4. Run Database Migration

```bash
cd apps/api
psql $DATABASE_URL -f db/migrations/0018_job_queue.sql
```

Or using migration runner:
```bash
node db/migrate.js
```

### 5. Install Worker Dependencies

```bash
cd apps/worker
pnpm install
```

### 6. Start Worker in Development

```bash
cd apps/worker
pnpm dev
```

Or with Docker:
```bash
docker-compose up worker
```

### 7. Test Integration

#### Test 1: Enqueue Upload Parse Job
```bash
curl -X POST http://localhost:3000/jobs/upload-parse \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "test_org",
    "file_id": "test_file_123",
    "file_hash": "abc123def456",
    "storage_url": "https://example.com/test.step"
  }'
```

Expected response:
```json
{
  "job_id": "upload-parse-test_file_123-1234567890",
  "status": "queued"
}
```

#### Test 2: Check Job Status
```bash
curl http://localhost:3000/jobs/upload-parse-test_file_123-1234567890
```

#### Test 3: Monitor Redis Pub/Sub
```bash
redis-cli
> PSUBSCRIBE jobs:*
```

#### Test 4: Check Worker Health
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "redis": "up",
  "queues": {
    "upload-parse": {
      "waiting": 0,
      "active": 0,
      "completed": 1,
      "failed": 0
    },
    "mesh-decimate": {
      "waiting": 0,
      "active": 0,
      "completed": 0,
      "failed": 0
    },
    "price-batch": {
      "waiting": 0,
      "active": 0,
      "completed": 0,
      "failed": 0
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 8. Test WebSocket Connection (Browser Console)

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3000/jobs');

// Subscribe to job
socket.emit('subscribe', {
  org_id: 'test_org',
  job_id: 'upload-parse-test_file_123-1234567890'
});

// Listen for subscribed event
socket.on('subscribed', (data) => {
  console.log('Subscribed:', data);
});

// Listen for progress updates
socket.on('progress', (payload) => {
  console.log('Progress:', payload);
});

// Later: unsubscribe
socket.emit('unsubscribe', {
  org_id: 'test_org',
  job_id: 'upload-parse-test_file_123-1234567890'
});
```

### 9. Update Existing Upload Endpoint

**File**: `apps/api/src/uploads/uploads.controller.ts`

Replace direct CAD service call with job enqueue:

```typescript
import { Queue } from 'bullmq';
import { Inject } from '@nestjs/common';

@Controller('uploads')
export class UploadsController {
  constructor(
    @Inject('UPLOAD_PARSE_QUEUE') private uploadParseQueue: Queue,
  ) {}

  @Post(':id/parse')
  async parseUpload(@Param('id') fileId: string) {
    // Get upload record
    const upload = await this.uploadsService.findOne(fileId);
    
    // Enqueue job instead of direct CAD call
    const job = await this.uploadParseQueue.add('upload-parse', {
      org_id: upload.org_id,
      file_id: fileId,
      file_hash: upload.file_hash,
      storage_url: upload.storage_url,
    }, {
      jobId: `upload-parse-${fileId}-${Date.now()}`,
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    });

    return {
      job_id: job.id,
      status: 'queued',
    };
  }
}
```

---

## Common Issues

### Issue: Worker can't connect to Redis
**Solution**: Check REDIS_URL environment variable, verify Redis is running
```bash
redis-cli ping  # Should return PONG
```

### Issue: WebSocket connection refused
**Solution**: 
- Check if API server started with WebSocket gateway
- Verify CORS settings in gateway
- Check browser console for errors

### Issue: Jobs stay in "queued" status
**Solution**:
- Verify worker service is running: `docker ps | grep worker`
- Check worker logs: `docker logs <worker-container>`
- Check Redis connection in worker health endpoint

### Issue: Idempotency key collision
**Solution**:
- Check if old job still exists: `redis-cli GET upload-parse:org_123:abc123`
- Delete stale key: `redis-cli DEL upload-parse:org_123:abc123`
- Or wait for TTL expiration (7 days)

---

## Production Deployment Checklist

- [ ] Set strong WORKER_SECRET in environment
- [ ] Configure OTEL_EXPORTER_OTLP_ENDPOINT for tracing
- [ ] Set NODE_ENV=production
- [ ] Configure Redis persistence (RDB or AOF)
- [ ] Set up monitoring for queue stats
- [ ] Configure alerting for failed jobs
- [ ] Set up log aggregation (e.g., ELK, Datadog)
- [ ] Test graceful shutdown (SIGTERM)
- [ ] Configure resource limits (CPU, memory) in Docker/k8s
- [ ] Set up auto-scaling for worker instances
- [ ] Configure Redis maxmemory policy (e.g., allkeys-lru)
- [ ] Set up backup for Redis data
- [ ] Configure firewall rules (only allow worker → API, worker → CAD)
- [ ] Enable TLS for Redis in production

---

## Next Steps After Integration

1. **Frontend Integration**: Update upload page to use job queue
2. **Unit Tests**: Test idempotency, retry logic, progress publishing
3. **E2E Tests**: Full workflow from enqueue → process → complete
4. **Load Testing**: Measure throughput and identify bottlenecks
5. **Monitoring Dashboard**: Grafana dashboard for queue metrics
6. **Alerting**: PagerDuty/Slack alerts for high failure rate
7. **Documentation**: Update API docs with new endpoints
8. **Training**: Team walkthrough of job queue system

---

## Support

For issues or questions:
- Check `docs/jobs.md` for detailed documentation
- Review worker logs: `docker logs -f <worker-container>`
- Check Redis: `redis-cli monitor` to see all commands
- Review BullMQ docs: https://docs.bullmq.io/
