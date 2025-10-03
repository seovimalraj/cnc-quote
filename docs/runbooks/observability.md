# Step 19: Observability Runbooks

## Table of Contents

1. [Trace a Slow Pricing Request](#trace-slow-pricing)
2. [Debug High API Error Rate](#debug-api-errors)
3. [Investigate Worker Queue Backlog](#investigate-queue-backlog)
4. [Troubleshoot CAD Service Issues](#troubleshoot-cad)
5. [Increase Sampling During Incident](#increase-sampling)
6. [Correlate Logs with Traces](#correlate-logs-traces)

---

## 1. Trace a Slow Pricing Request {#trace-slow-pricing}

### Symptoms
- Alert: `HighPricingLatency` firing
- Dashboard shows p95 pricing latency >2s
- User reports slow quote generation

### Investigation Steps

#### Step 1: Find the Trace ID

**From Dashboard**:
1. Open Grafana → "E2E Pricing Observability" dashboard
2. Click on "Top Error Logs with Trace IDs" panel
3. Find slow request log entry
4. Copy `traceId` from log line

**From Application Logs**:
```bash
# Search logs for slow requests
kubectl logs -l app=api --tail=1000 | grep "duration_ms" | grep -E "duration_ms\":[2-9][0-9]{3,}" | jq -r '.traceId' | head -5

# Or with Loki
curl -G -s "http://loki:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={service="api"} |= "pricing" | json | duration_ms > 2000' \
  | jq -r '.data.result[].values[][1]' | jq -r '.traceId'
```

#### Step 2: Open Trace in Jaeger/Tempo

**Jaeger**:
```
http://jaeger:16686/trace/{TRACE_ID}
```

**Tempo (via Grafana)**:
1. Go to Grafana → Explore
2. Select "Tempo" datasource
3. Paste trace ID
4. Click "Run Query"

#### Step 3: Analyze Span Timings

Look for spans with highest **self-time** (excluding child spans):

**Common Culprits**:
- **API → Worker**: High if queue is backed up
- **Worker → CAD**: High if CAD service is slow
- **CAD extract**: High if part is complex or CAD hung

**Example Analysis**:
```
Total: 3500ms
├─ api.pricing.priceOne: 3500ms (self: 50ms) ✅ Fast
│  └─ worker.job.process: 3400ms (self: 100ms) ✅ Fast
│     └─ cad.extract: 3200ms (self: 3200ms) ⚠️ BOTTLENECK
```

**Root Cause**: CAD extract is the bottleneck (3.2s)

#### Step 4: Deep Dive into Slow Component

**If Worker is Slow**:
```bash
# Check queue depth
curl -s http://worker:3001/health | jq '.queues'

# Check active jobs
redis-cli LLEN bull:price-batch:active

# Check failed jobs
redis-cli LLEN bull:price-batch:failed
```

**If CAD is Slow**:
```bash
# Check CAD logs with same traceId
kubectl logs -l app=cad --tail=5000 | grep "{TRACE_ID}" | jq .

# Check CAD CPU/memory
kubectl top pod -l app=cad

# Check for stuck processes
kubectl exec -it <cad-pod> -- ps aux | grep python
```

#### Step 5: Remediation

**Queue Backlog**:
```bash
# Scale workers
kubectl scale deployment worker --replicas=8
```

**CAD Overloaded**:
```bash
# Scale CAD service
kubectl scale deployment cad --replicas=4

# Or increase resources
kubectl set resources deployment cad --limits=cpu=2,memory=4Gi
```

**Complex Part**:
- Check part complexity (triangle count, file size)
- Consider pre-processing or caching
- Adjust CAD timeout settings

---

## 2. Debug High API Error Rate {#debug-api-errors}

### Symptoms
- Alert: `APIErrorRateHigh` firing
- Dashboard shows >2% 5xx errors
- Users reporting "Internal Server Error"

### Investigation Steps

#### Step 1: Identify Error Pattern

**Check Error Rate by Route**:
```promql
sum(rate(api_http_requests_total{status=~"5.."}[5m])) by (route, status)
```

**Check Error Logs**:
```bash
# Last 100 errors
kubectl logs -l app=api --tail=5000 | grep '"level":"error"' | tail -100 | jq -c '{ts, traceId, route, error}'

# Group errors by message
kubectl logs -l app=api --tail=5000 | grep '"level":"error"' | jq -r '.error' | sort | uniq -c | sort -rn
```

#### Step 2: Analyze Error Traces

Pick a `traceId` from error logs and open in Jaeger:

**Look for**:
- Span with `error=true` attribute
- Exception details in span events
- HTTP status codes
- Database query failures

#### Step 3: Common Issues & Fixes

**Database Connection Pool Exhausted**:
```bash
# Check pg pool stats
kubectl logs -l app=api | grep "pool"

# Increase pool size (api .env)
DATABASE_POOL_SIZE=50
```

**Redis Connection Timeout**:
```bash
# Check Redis latency
redis-cli --latency

# Check Redis connections
redis-cli CLIENT LIST | wc -l

# Restart Redis if needed
kubectl rollout restart statefulset redis
```

**Downstream Service Timeout**:
```bash
# Check CAD service health
curl http://cad:8000/health

# Increase timeout (api config)
CAD_TIMEOUT_MS=30000
```

#### Step 4: Emergency Mitigation

**If Cascading Failure**:
```bash
# Enable circuit breaker (if configured)
kubectl set env deployment/api CIRCUIT_BREAKER_ENABLED=true

# Or temporarily disable failing feature
kubectl set env deployment/api FEATURE_DFM_ENABLED=false
```

**If Database Overload**:
```bash
# Read from replica
kubectl set env deployment/api DATABASE_READ_REPLICA_URL=postgres://replica:5432/db

# Or scale database
kubectl scale statefulset postgres --replicas=3
```

---

## 3. Investigate Worker Queue Backlog {#investigate-queue-backlog}

### Symptoms
- Alert: `WorkerQueueBacklog` firing
- Dashboard shows queue depth >500
- Jobs taking long to complete

### Investigation Steps

#### Step 1: Check Queue Stats

```bash
# Via worker health endpoint
curl -s http://worker:3001/health | jq '.queues'

# Via Redis directly
redis-cli LLEN bull:price-batch:waiting
redis-cli LLEN bull:price-batch:active
redis-cli LLEN bull:price-batch:failed
```

**Expected Output**:
```json
{
  "price-batch": {
    "waiting": 523,    ⚠️ HIGH
    "active": 4,       ✅ OK
    "completed": 1200,
    "failed": 15
  }
}
```

#### Step 2: Check Worker Health

```bash
# Check worker pods
kubectl get pods -l app=worker

# Check worker logs for errors
kubectl logs -l app=worker --tail=100 | grep '"level":"error"'

# Check worker CPU/memory
kubectl top pod -l app=worker
```

#### Step 3: Analyze Job Failures

```bash
# Get failed job IDs
redis-cli LRANGE bull:price-batch:failed 0 10

# Inspect failed job
redis-cli HGETALL bull:price-batch:{JOB_ID}

# Check failure reason
redis-cli HGET bull:price-batch:{JOB_ID} failedReason
```

#### Step 4: Remediation

**Scale Workers**:
```bash
# Horizontal scaling
kubectl scale deployment worker --replicas=8

# Verify scaling
kubectl get pods -l app=worker

# Monitor queue drain rate
watch -n 5 "curl -s http://worker:3001/health | jq '.queues.\"price-batch\".waiting'"
```

**Increase Worker Concurrency**:
```bash
# Update environment variable
kubectl set env deployment/worker WORKER_CONCURRENCY_DEFAULT=8

# Restart workers
kubectl rollout restart deployment worker
```

**Clear Failed Jobs** (if appropriate):
```bash
# Review failed jobs first!
redis-cli LRANGE bull:price-batch:failed 0 -1 > failed-jobs-backup.txt

# Clear failed queue
redis-cli DEL bull:price-batch:failed

# Or retry all
node scripts/retry-failed-jobs.js price-batch
```

---

## 4. Troubleshoot CAD Service Issues {#troubleshoot-cad}

### Symptoms
- Alert: `CADExtractLatencyHigh` or `CADExtractFailureRateHigh`
- Worker jobs timing out
- Traces show CAD spans taking >20s

### Investigation Steps

#### Step 1: Check CAD Service Health

```bash
# Health endpoint
curl http://cad:8000/health

# Check pods
kubectl get pods -l app=cad

# Check logs
kubectl logs -l app=cad --tail=200 | jq -c '{ts, traceId, msg, duration_ms, error}'
```

#### Step 2: Identify Slow Operations

**From Logs**:
```bash
# Find slowest operations
kubectl logs -l app=cad --tail=5000 | jq 'select(.duration_ms > 15000)' | jq -c '{ts, operation, duration_ms, part}'
```

**From Traces**:
- Open slow trace in Jaeger
- Look for long `cad.extract`, `cad.mesh.decimate`, or `cad.features.detect` spans

#### Step 3: Common Issues

**OpenCASCADE Hanging**:
```bash
# Check for stuck Python processes
kubectl exec -it <cad-pod> -- ps aux | grep python

# If stuck, restart pod
kubectl delete pod <cad-pod>
```

**Memory Leak**:
```bash
# Check memory usage trend
kubectl top pod -l app=cad

# If growing, restart periodically (add liveness probe)
kubectl set probe deployment/cad --liveness --get-url=http://:8000/health --initial-delay-seconds=30 --period-seconds=60
```

**Complex Part File**:
```bash
# Check file size
kubectl logs -l app=cad | jq 'select(.msg | contains("extract")) | {file_size_bytes, triangle_count}'

# Set size limits (cad config)
MAX_FILE_SIZE_MB=50
MAX_TRIANGLE_COUNT=100000
```

#### Step 4: Scaling & Resource Limits

```bash
# Scale CAD pods
kubectl scale deployment cad --replicas=6

# Increase resources
kubectl set resources deployment cad \
  --requests=cpu=500m,memory=1Gi \
  --limits=cpu=2,memory=4Gi

# Add PodDisruptionBudget
kubectl apply -f k8s/cad-pdb.yaml
```

---

## 5. Increase Sampling During Incident {#increase-sampling}

### When to Use
- Incident in progress, need more trace visibility
- Reproducing rare issue
- Load testing

### Steps

#### Step 1: Increase Sampling Rate

**API**:
```bash
kubectl set env deployment/api TRACE_SAMPLING_RATE=1.0
```

**Worker**:
```bash
kubectl set env deployment/worker TRACE_SAMPLING_RATE=1.0
```

**CAD**:
```bash
kubectl set env deployment/cad TRACE_SAMPLING_RATE=1.0
```

#### Step 2: Verify Collector Capacity

```bash
# Check collector CPU/memory
kubectl top pod -l app=otel-collector

# Check collector logs for drops
kubectl logs -l app=otel-collector --tail=100 | grep -i "drop"

# If overloaded, scale collector
kubectl scale deployment otel-collector --replicas=3
```

#### Step 3: Monitor Trace Volume

```bash
# Check traces ingested
curl -s http://tempo:3200/api/metrics | grep traces_ingested_total

# Check tempo storage
kubectl exec -it tempo-0 -- df -h /data
```

#### Step 4: Revert After Incident

```bash
# Revert sampling to 10%
kubectl set env deployment/api TRACE_SAMPLING_RATE=0.1
kubectl set env deployment/worker TRACE_SAMPLING_RATE=0.1
kubectl set env deployment/cad TRACE_SAMPLING_RATE=0.1

# Restart pods (optional)
kubectl rollout restart deployment/api deployment/worker deployment/cad
```

**⚠️ Important**: Don't forget to revert! 100% sampling can overwhelm storage.

---

## 6. Correlate Logs with Traces {#correlate-logs-traces}

### Use Case
- Have trace ID, want to see detailed logs
- Have log error, want to see full trace

### From Trace ID → Logs

**Via Loki**:
```bash
curl -G -s "http://loki:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={service=~"api|worker|cad"} |= "{TRACE_ID}"' \
  | jq -r '.data.result[].values[][1]'
```

**Via kubectl**:
```bash
# API logs
kubectl logs -l app=api --tail=10000 | grep "{TRACE_ID}"

# Worker logs
kubectl logs -l app=worker --tail=10000 | grep "{TRACE_ID}"

# CAD logs
kubectl logs -l app=cad --tail=10000 | grep "{TRACE_ID}"
```

**In Grafana** (with Loki datasource):
1. Go to Explore
2. Select Loki
3. Query: `{service=~"api|worker|cad"} |= "{TRACE_ID}"`
4. Click "Run Query"

### From Log Error → Trace

**Extract Trace ID**:
```bash
# From error log
kubectl logs -l app=api --tail=5000 | grep '"level":"error"' | jq -r '{ts, traceId, error}' | head -1

# Example output:
# {"ts":"2025-10-02T10:30:00.000Z","traceId":"abc123...","error":"CAD timeout"}
```

**Open Trace**:
```
http://jaeger:16686/trace/abc123...
```

### Create Grafana Link

**In Log Panel** (Loki), add derived field:
```
Field name: traceId
Regex: "traceId":"([^"]+)"
URL: http://jaeger:16686/trace/${__value.raw}
Label: View Trace
```

Now clicking "View Trace" button in logs opens Jaeger!

---

## Emergency Contacts

- **On-Call Engineer**: Check PagerDuty schedule
- **Platform Team**: #platform-oncall Slack
- **Database Team**: #database-support Slack

## Post-Incident Review

After resolving incident:

1. **Update Runbook** with new findings
2. **Create JIRA ticket** for permanent fix
3. **Document in Incident Log**: `docs/incidents/{DATE}.md`
4. **Schedule Postmortem** (within 48h for P0/P1)

## Related Documentation

- [Observability Setup Guide](./STEP19_OBSERVABILITY_GUIDE.md)
- [Metrics Reference](./STEP19_METRICS_REFERENCE.md)
- [Alerting Configuration](../monitoring/prometheus/rules/alerts.yml)
- [Dashboard Documentation](../monitoring/grafana/README.md)
