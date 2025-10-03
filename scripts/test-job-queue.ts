/**
 * Step 18: Job Queue System Test Script
 * Quick verification that all components are working
 */

import axios from 'axios';
import { io } from 'socket.io-client';

const API_URL = process.env.API_URL || 'http://localhost:3000';
const WORKER_HEALTH_URL = process.env.WORKER_HEALTH_URL || 'http://localhost:3001';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({
      test: name,
      status: 'PASS',
      message: 'Success',
      duration: Date.now() - start,
    });
    console.log(`✅ ${name}`);
  } catch (error: any) {
    results.push({
      test: name,
      status: 'FAIL',
      message: error.message,
      duration: Date.now() - start,
    });
    console.error(`❌ ${name}: ${error.message}`);
  }
}

async function runTests(): Promise<void> {
  console.log('🚀 Starting Job Queue System Tests\n');

  // Test 1: Worker health check
  await test('Worker health endpoint', async () => {
    const response = await axios.get(`${WORKER_HEALTH_URL}/health`);
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    if (response.data.status !== 'healthy') {
      throw new Error(`Worker not healthy: ${response.data.status}`);
    }
  });

  // Test 2: Worker readiness check
  await test('Worker readiness probe', async () => {
    const response = await axios.get(`${WORKER_HEALTH_URL}/ready`);
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
    if (response.data.status !== 'ready') {
      throw new Error(`Worker not ready: ${response.data.status}`);
    }
  });

  // Test 3: Worker liveness check
  await test('Worker liveness probe', async () => {
    const response = await axios.get(`${WORKER_HEALTH_URL}/live`);
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }
  });

  // Test 4: Enqueue upload-parse job
  let jobId: string;
  await test('Enqueue upload-parse job', async () => {
    const response = await axios.post(`${API_URL}/jobs/upload-parse`, {
      org_id: 'test_org',
      file_id: 'test_file_123',
      file_hash: 'abc123def456',
      storage_url: 'https://example.com/test.step',
    });

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Expected 200/201, got ${response.status}`);
    }

    jobId = response.data.job_id;
    if (!jobId) {
      throw new Error('No job_id in response');
    }
  });

  // Test 5: Get job status
  await test('Get job status', async () => {
    if (!jobId) {
      throw new Error('No job_id from previous test');
    }

    const response = await axios.get(`${API_URL}/jobs/${jobId}`);
    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    if (!response.data.job_id) {
      throw new Error('No job_id in response');
    }
  });

  // Test 6: Enqueue mesh-decimate job
  await test('Enqueue mesh-decimate job', async () => {
    const response = await axios.post(`${API_URL}/jobs/mesh-decimate`, {
      org_id: 'test_org',
      part_id: 'test_part_456',
      file_hash: 'def456ghi789',
      mesh_quality: 'med',
    });

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Expected 200/201, got ${response.status}`);
    }

    if (!response.data.job_id) {
      throw new Error('No job_id in response');
    }
  });

  // Test 7: Enqueue price-batch job
  await test('Enqueue price-batch job', async () => {
    const response = await axios.post(`${API_URL}/jobs/price-batch`, {
      org_id: 'test_org',
      quote_id: 'test_quote_789',
      line_ids: ['line_1', 'line_2', 'line_3'],
      config: {},
    });

    if (response.status !== 201 && response.status !== 200) {
      throw new Error(`Expected 200/201, got ${response.status}`);
    }

    if (!response.data.job_id || !response.data.batch_hash) {
      throw new Error('Missing job_id or batch_hash in response');
    }
  });

  // Test 8: Test idempotency (duplicate request)
  await test('Test idempotency with duplicate request', async () => {
    const payload = {
      org_id: 'test_org',
      file_id: 'test_file_duplicate',
      file_hash: 'duplicate_hash_123',
      storage_url: 'https://example.com/duplicate.step',
    };

    // First request
    const response1 = await axios.post(`${API_URL}/jobs/upload-parse`, payload);
    const jobId1 = response1.data.job_id;

    // Second request (duplicate)
    const response2 = await axios.post(`${API_URL}/jobs/upload-parse`, payload);
    const jobId2 = response2.data.job_id;

    if (jobId1 !== jobId2) {
      throw new Error(`Idempotency failed: ${jobId1} !== ${jobId2}`);
    }

    if (!response2.data.duplicate) {
      console.warn('⚠️  Duplicate flag not set (may be normal if first job completed)');
    }
  });

  // Test 9: WebSocket connection
  await test('WebSocket connection and subscription', async () => {
    return new Promise((resolve, reject) => {
      const socket = io(`${API_URL}/jobs`, {
        transports: ['websocket'],
      });

      const timeout = setTimeout(() => {
        socket.disconnect();
        reject(new Error('WebSocket connection timeout'));
      }, 5000);

      socket.on('connect', () => {
        console.log('  📡 WebSocket connected');

        // Subscribe to a job
        socket.emit('subscribe', {
          org_id: 'test_org',
          job_id: 'test_job_ws',
        });

        socket.on('subscribed', (data: any) => {
          console.log('  ✓ Subscribed:', data);
          clearTimeout(timeout);
          socket.disconnect();
          resolve();
        });

        socket.on('error', (error: any) => {
          clearTimeout(timeout);
          socket.disconnect();
          reject(error);
        });
      });

      socket.on('connect_error', (error: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        reject(error);
      });
    });
  });

  // Test 10: Queue stats
  await test('Queue statistics available', async () => {
    const response = await axios.get(`${WORKER_HEALTH_URL}/health`);
    const queues = response.data.queues;

    if (!queues || typeof queues !== 'object') {
      throw new Error('No queues in health response');
    }

    const requiredQueues = ['upload-parse', 'mesh-decimate', 'price-batch'];
    for (const queueName of requiredQueues) {
      if (!queues[queueName]) {
        throw new Error(`Missing queue stats for ${queueName}`);
      }

      const stats = queues[queueName];
      if (typeof stats.waiting !== 'number' ||
          typeof stats.active !== 'number' ||
          typeof stats.completed !== 'number' ||
          typeof stats.failed !== 'number') {
        throw new Error(`Invalid stats for ${queueName}`);
      }
    }
  });

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('Test Results Summary');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total = results.length;

  console.log(`\nTotal: ${total} | Passed: ${passed} | Failed: ${failed}\n`);

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test} (${result.duration}ms)`);
    if (result.status === 'FAIL') {
      console.log(`   Error: ${result.message}`);
    }
  });

  console.log('\n' + '='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
