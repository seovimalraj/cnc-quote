# Step 18: Job Queue System

## Overview

This document describes the BullMQ-based job queue system introduced in Step 18 to decouple heavy CAD/pricing workloads from the API. The system provides:

- **Reliable job orchestration** with automatic retries and exponential backoff
- **Idempotent job execution** via Redis-based deduplication keys
- **Real-time progress updates** via WebSocket and HTTP fallback
- **Resumable jobs** after browser refresh using persistent event storage
- **Distributed tracing** with OpenTelemetry for observability

## Architecture

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Web UI    │──WS──→│   API       │       │   Worker    │
│             │       │  (Producer) │       │  (Consumer) │
└─────────────┘       └──────┬──────┘       └──────┬──────┘
                             │                     │
                             │  Enqueue Jobs       │
                             ├────────────────────→│
                             │                     │
                             │  Progress Events    │
                             │←────────────────────┤
                             │                     │
                      ┌──────▼──────┐       ┌──────▼──────┐
                      │   Redis     │←──────│  CAD Service│
                      │  (BullMQ)   │       │  (Python)   │
                      └─────────────┘       └─────────────┘
```

### Components

1. **Worker Service** (`apps/worker`): Standalone Node.js service that consumes jobs from Redis queues
2. **API Producer** (`apps/api/src/queues`): NestJS endpoints for enqueuing jobs
3. **WebSocket Gateway** (`apps/api/src/ws`): Real-time progress relay to frontend
4. **Redis**: Job queue backend + idempotency key store + pub/sub broker

## Job Types

### 1. `upload-parse` - CAD File Parsing

**Purpose**: Parse uploaded CAD files and extract metadata (bounding box, part count, material)

**Payload**:
```typescript
{
  org_id: string;        // Organization ID
  file_id: string;       // Upload record ID
  file_hash: string;     // SHA-256 hash for idempotency
  storage_url: string;   // Signed URL to download file
}
```

**Idempotency Key**: `upload-parse:${org_id}:${file_hash}`

**Workflow**:
1. Download file from `storage_url` (10% progress)
2. Verify SHA-256 hash matches `file_hash`
3. POST to CAD service `/parse` endpoint (30% progress)
4. PUT metadata to API `/uploads/${file_id}/metadata` (70% progress)
5. Complete (100%)

**Result**:
```typescript
{
  file_id: string;
  file_hash: string;
  bounding_box: { x: number; y: number; z: number };
  part_count: number;
  material?: string;
  geometry_blob_url: string;
}
```

**Concurrency**: 4 workers
**Rate Limit**: 20 jobs/sec
**Attempts**: 5
**Backoff**: Exponential 5s → 120s

---

### 2. `mesh-decimate` - LOD Mesh Generation

**Purpose**: Generate decimated meshes for 3D viewer at different quality levels

**Payload**:
```typescript
{
  org_id: string;
  part_id: string;
  file_hash: string;
  mesh_quality: 'low' | 'med' | 'high';
}
```

**Idempotency Key**: `mesh-decimate:${org_id}:${file_hash}:${mesh_quality}`

**Workflow**:
1. POST to CAD service `/mesh` with `{ file_hash, quality, format: 'gltf' }` (10% progress)
2. Wait for mesh generation (timeout: 3 minutes)
3. PUT to API `/parts/${part_id}/mesh` with mesh_url, triangle_count (70% progress)
4. Complete (100%)

**Result**:
```typescript
{
  part_id: string;
  mesh_quality: 'low' | 'med' | 'high';
  mesh_url: string;
  triangle_count: number;
  file_size_bytes: number;
}
```

**Concurrency**: 4 workers
**Rate Limit**: 10 jobs/sec
**Attempts**: 5
**Backoff**: Exponential 5s → 120s

---

### 3. `price-batch` - Bulk Pricing

**Purpose**: Compute pricing for multiple quote lines in parallel

**Payload**:
```typescript
{
  org_id: string;
  quote_id: string;
  line_ids: string[];
  config?: {
    material_overrides?: Record<string, string>;
    process_overrides?: Record<string, string>;
  };
}
```

**Idempotency Key**: `price-batch:${org_id}:${batch_hash}`  
_(batch_hash = SHA-256 of canonical JSON: sorted line_ids + config)_

**Workflow**:
1. Iterate over `line_ids`
2. For each line: POST to API `/pricing/compute`
3. Emit progress every 10% or per line (for small batches)
4. Preserve partial results on failure
5. Complete with summary

**Result**:
```typescript
{
  quote_id: string;
  line_ids: string[];
  completed: number;
  failed: number;
  results: Array<{
    line_id: string;
    success: boolean;
    price?: number;
    error?: string;
  }>;
}
```

**Concurrency**: 2 workers
**Rate Limit**: 5 jobs/sec
**Attempts**: 3
**Backoff**: Exponential 10s → 300s

---

## API Endpoints

### Producer Endpoints (Enqueue Jobs)

#### `POST /jobs/upload-parse`

Enqueue CAD file parsing job.

**Request**:
```json
{
  "org_id": "org_123",
  "file_id": "file_456",
  "file_hash": "abc123...",
  "storage_url": "https://...",
  "trace_id": "optional-trace-id"
}
```

**Response**:
```json
{
  "job_id": "upload-parse-file_456-1234567890",
  "status": "queued",
  "trace_id": "optional-trace-id"
}
```

**Response (Duplicate)**:
```json
{
  "job_id": "existing-job-id",
  "status": "active",
  "duplicate": true
}
```

---

#### `POST /jobs/mesh-decimate`

Enqueue mesh decimation job.

**Request**:
```json
{
  "org_id": "org_123",
  "part_id": "part_789",
  "file_hash": "abc123...",
  "mesh_quality": "med",
  "trace_id": "optional-trace-id"
}
```

**Response**: Same as `upload-parse`

---

#### `POST /jobs/price-batch`

Enqueue batch pricing job.

**Request**:
```json
{
  "org_id": "org_123",
  "quote_id": "quote_101",
  "line_ids": ["line_1", "line_2", "line_3"],
  "config": {
    "material_overrides": {
      "line_1": "aluminum-6061"
    }
  },
  "trace_id": "optional-trace-id"
}
```

**Response**:
```json
{
  "job_id": "price-batch-quote_101-1234567890",
  "status": "queued",
  "trace_id": "optional-trace-id",
  "batch_hash": "def456..."
}
```

---

#### `GET /jobs/:id`

Get job status and result.

**Response**:
```json
{
  "job_id": "upload-parse-file_456-1234567890",
  "status": "completed",
  "progress": 100,
  "data": { /* original payload */ },
  "returnvalue": { /* result object */ },
  "failedReason": null,
  "processedOn": 1234567890,
  "finishedOn": 1234567891,
  "attemptsMade": 1
}
```

---

### WebSocket Endpoints (Real-time Updates)

#### Connect

```javascript
const socket = io('ws://localhost:3000/jobs');
```

#### Subscribe to Job

```javascript
socket.emit('subscribe', {
  org_id: 'org_123',
  job_id: 'upload-parse-file_456-1234567890'
});

socket.on('subscribed', (data) => {
  console.log('Subscribed to job:', data);
});
```

#### Receive Progress

```javascript
socket.on('progress', (payload) => {
  console.log('Job progress:', payload);
  // payload: { job_id, status, progress, message, meta, trace_id, error, result }
});
```

#### Unsubscribe

```javascript
socket.emit('unsubscribe', {
  org_id: 'org_123',
  job_id: 'upload-parse-file_456-1234567890'
});
```

---

## Job Statuses

| Status      | Description                                     |
|-------------|-------------------------------------------------|
| `queued`    | Job enqueued, waiting for worker                |
| `active`    | Worker picked up job, processing started        |
| `progress`  | Job in progress (with progress %)               |
| `completed` | Job finished successfully                       |
| `failed`    | Job failed after all retry attempts             |
| `stalled`   | Job stalled (worker crashed, will be retried)   |
| `retrying`  | Job failed, retrying with exponential backoff   |
| `cancelled` | Job manually cancelled (not implemented yet)    |

---

## Idempotency

All jobs use Redis-based idempotency keys to prevent duplicate processing:

1. **Key Format**: `${job_type}:${org_id}:${hash}`
2. **Storage**: Redis `SET NX` with TTL = 7 days
3. **Behavior**:
   - If key exists: Return existing job ID (duplicate)
   - If key new: Create new job and store key

**Example**:
```typescript
const key = `upload-parse:org_123:abc123...`;
const result = await redis.set(key, jobId, 'EX', 604800, 'NX');
// result = 'OK' if new, null if duplicate
```

---

## Retry Strategy

Jobs automatically retry on failure with exponential backoff:

| Job Type       | Max Attempts | Base Delay | Max Delay |
|----------------|--------------|------------|-----------|
| upload-parse   | 5            | 5s         | 120s      |
| mesh-decimate  | 5            | 5s         | 120s      |
| price-batch    | 3            | 10s        | 300s      |

**Backoff Formula**: `delay = min(base_delay * 2^attempt, max_delay)`

**Example Retry Timeline** (upload-parse):
- Attempt 1 fails → wait 5s
- Attempt 2 fails → wait 10s
- Attempt 3 fails → wait 20s
- Attempt 4 fails → wait 40s
- Attempt 5 fails → wait 80s
- Attempt 6 fails → job marked as failed

---

## Progress Tracking

Workers publish progress events via dual channels:

### 1. Redis Pub/Sub (Primary)

```typescript
redis.publish(`jobs:${org_id}:${job_id}`, JSON.stringify({
  job_id: 'upload-parse-file_456-1234567890',
  status: 'progress',
  progress: 30,
  message: 'Parsing CAD file...',
  meta: { file_name: 'bracket.step' },
  trace_id: 'abc123'
}));
```

### 2. HTTP POST (Fallback)

```bash
curl -X POST http://api:3000/ws/job-events \
  -H "X-Worker-Secret: secret123" \
  -H "Content-Type: application/json" \
  -d '{
    "org_id": "org_123",
    "job_id": "upload-parse-file_456-1234567890",
    "status": "progress",
    "progress": 30,
    "message": "Parsing CAD file...",
    "meta": {},
    "trace_id": "abc123"
  }'
```

API receives and relays to WebSocket clients subscribed to `org_123:job_id` room.

---

## Frontend Integration

### Example: Upload Page with Resume Logic

```typescript
// Step 1: Check localStorage for in-progress job
const inProgressJob = localStorage.getItem('upload_job_id');
if (inProgressJob) {
  // Resume subscription
  socket.emit('subscribe', {
    org_id: currentOrgId,
    job_id: inProgressJob
  });
}

// Step 2: Enqueue new job
const response = await fetch('/jobs/upload-parse', {
  method: 'POST',
  body: JSON.stringify({
    org_id: currentOrgId,
    file_id: 'file_456',
    file_hash: 'abc123...',
    storage_url: signedUrl
  })
});

const { job_id } = await response.json();

// Save to localStorage for resume
localStorage.setItem('upload_job_id', job_id);

// Subscribe to progress
socket.emit('subscribe', { org_id: currentOrgId, job_id });

// Step 3: Listen for progress
socket.on('progress', (payload) => {
  console.log('Progress:', payload.progress, '%');
  console.log('Status:', payload.status);
  
  if (payload.status === 'completed') {
    console.log('Result:', payload.result);
    localStorage.removeItem('upload_job_id');
  } else if (payload.status === 'failed') {
    console.error('Error:', payload.error);
    localStorage.removeItem('upload_job_id');
  }
});
```

---

## Observability

### OpenTelemetry Tracing

All jobs propagate trace context:

```typescript
// API enqueues job with trace_id
const span = tracer.startSpan('enqueue-upload-parse');
const trace_id = span.spanContext().traceId;

await queue.add('upload-parse', {
  org_id: 'org_123',
  file_id: 'file_456',
  file_hash: 'abc123...',
  storage_url: signedUrl,
  trace_id
});

span.end();

// Worker picks up job and continues trace
const span = tracer.startSpan('process-upload-parse', {
  links: [{ context: { traceId: job.data.trace_id } }]
});

// ... process job ...

span.end();
```

### Logs

Structured logs with Pino:

```json
{
  "level": "info",
  "time": 1234567890,
  "service": "worker",
  "env": "production",
  "job_id": "upload-parse-file_456-1234567890",
  "job_type": "upload-parse",
  "status": "completed",
  "duration_ms": 5432,
  "msg": "Job completed successfully"
}
```

### Health Checks

Worker service exposes HTTP endpoints on port 3001:

- **`GET /health`**: Overall health + queue stats
- **`GET /ready`**: Readiness probe (Redis connection)
- **`GET /live`**: Liveness probe (always returns 200)

**Example Response** (`/health`):
```json
{
  "status": "healthy",
  "redis": "up",
  "queues": {
    "upload-parse": {
      "waiting": 5,
      "active": 2,
      "completed": 100,
      "failed": 3
    },
    "mesh-decimate": {
      "waiting": 1,
      "active": 3,
      "completed": 50,
      "failed": 0
    },
    "price-batch": {
      "waiting": 0,
      "active": 1,
      "completed": 20,
      "failed": 2
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## Deployment

### Environment Variables

**Worker Service** (`apps/worker/.env`):
```bash
REDIS_URL=redis://redis:6379
WORKER_CONCURRENCY_DEFAULT=4
API_BASE_URL=http://api:3000
CAD_SERVICE_URL=http://cad-service:8000
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
NODE_ENV=production
HEALTH_PORT=3001
WORKER_SECRET=your-secret-here
JOB_TTL_SECONDS=604800  # 7 days
```

**API** (`apps/api/.env`):
```bash
REDIS_URL=redis://redis:6379
WORKER_SECRET=your-secret-here  # Must match worker
```

### Docker Compose

Add worker service to `docker-compose.yml`:

```yaml
services:
  worker:
    build:
      context: ./apps/worker
      dockerfile: Dockerfile
    environment:
      - REDIS_URL=redis://redis:6379
      - WORKER_CONCURRENCY_DEFAULT=4
      - API_BASE_URL=http://api:3000
      - CAD_SERVICE_URL=http://cad-service:8000
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
      - NODE_ENV=production
      - HEALTH_PORT=3001
      - WORKER_SECRET=${WORKER_SECRET}
    depends_on:
      - redis
      - api
      - cad-service
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped
```

### Scaling Workers

To handle more load, scale worker instances:

```bash
docker-compose up -d --scale worker=4
```

Each worker will:
- Connect to same Redis instance
- Process jobs concurrently (up to configured concurrency per worker)
- Coordinate via Redis to avoid duplicate processing

**Example**: 4 workers × 4 concurrency = 16 parallel `upload-parse` jobs

---

## Troubleshooting

### Job Stuck in Queue

**Symptom**: Job status is `queued` for a long time

**Check**:
1. Worker service running? `docker ps | grep worker`
2. Worker logs: `docker logs <worker-container>`
3. Redis connection: `redis-cli ping`
4. Queue stats: `curl http://worker:3001/health`

**Fix**:
- Restart worker: `docker restart <worker-container>`
- Check Redis memory: `redis-cli info memory`
- Increase concurrency if needed

---

### Job Failed After All Retries

**Symptom**: Job status is `failed`, `attemptsMade` = max attempts

**Check**:
1. Worker logs for error details
2. `GET /jobs/:id` to see `failedReason`
3. Check CAD service health: `curl http://cad-service:8000/health`

**Fix**:
- Fix underlying issue (e.g., CAD service down)
- Manually retry via UI or API:
  ```bash
  curl -X POST /jobs/upload-parse \
    -d '{ "org_id": "...", "file_id": "...", "file_hash": "...", "storage_url": "..." }'
  ```

---

### WebSocket Not Receiving Updates

**Symptom**: Frontend doesn't receive progress events

**Check**:
1. WebSocket connection: Browser DevTools → Network → WS
2. Subscription confirmed? Look for `subscribed` event
3. Redis pub/sub active? `redis-cli> PSUBSCRIBE jobs:*` in separate terminal
4. API logs for relay errors

**Fix**:
- Check CORS settings in WebSocket gateway
- Verify `org_id` and `job_id` match exactly
- Check Redis connection in API: `redis-cli> CLIENT LIST`

---

### Idempotency Key Stale

**Symptom**: Can't enqueue new job because idempotency key exists, but old job is gone

**Check**:
```bash
redis-cli
> GET upload-parse:org_123:abc123...
> TTL upload-parse:org_123:abc123...
```

**Fix**:
- Delete stale key: `redis-cli> DEL upload-parse:org_123:abc123...`
- Or wait for TTL expiration (7 days)
- Or manually clean up: `redis-cli --scan --pattern "upload-parse:*" | xargs redis-cli DEL`

---

## Performance Tuning

### Adjust Concurrency

Edit `apps/worker/.env`:
```bash
WORKER_CONCURRENCY_DEFAULT=8  # Default for all queues
```

Or per-queue in `apps/worker/src/queues/index.ts`:
```typescript
const uploadParseWorker = new Worker('upload-parse', processUploadParse, {
  connection: redis,
  concurrency: 8, // Override default
  // ...
});
```

### Adjust Rate Limits

In `apps/worker/src/queues/index.ts`:
```typescript
const uploadParseWorker = new Worker('upload-parse', processUploadParse, {
  connection: redis,
  concurrency: 4,
  limiter: {
    max: 50, // 50 jobs per duration
    duration: 1000, // 1 second
  },
  // ...
});
```

### Adjust TTL

Edit `apps/worker/.env`:
```bash
JOB_TTL_SECONDS=1209600  # 14 days instead of 7
```

---

## Future Enhancements

- [ ] Job cancellation endpoint (`POST /jobs/:id/cancel`)
- [ ] Job priority support (high/normal/low)
- [ ] Dead letter queue for failed jobs
- [ ] Admin UI for queue management
- [ ] Metrics dashboard (Grafana + Prometheus)
- [ ] Job scheduling (cron-like recurring jobs)
- [ ] Job chaining (mesh-decimate after upload-parse)
- [ ] Rate limiting per org_id
- [ ] Cost attribution per job (for billing)

---

## References

- **BullMQ Documentation**: https://docs.bullmq.io/
- **Redis Documentation**: https://redis.io/docs/
- **OpenTelemetry**: https://opentelemetry.io/docs/
- **Socket.IO**: https://socket.io/docs/v4/
