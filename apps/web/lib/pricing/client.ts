/**
 * Step 13: Pricing HTTP Client
 * Handles API calls with exponential backoff for async job polling
 */

import { PricingRequest, PricingResponse, PricingJobResponse } from './types';

const MAX_POLL_ATTEMPTS = 10;
const INITIAL_DELAY_MS = 200;
const BACKOFF_MULTIPLIER = 1.6;
const MAX_DELAY_MS = 3000;

/**
 * Sleep utility for polling delays
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch price from API with automatic 202 polling
 * Handles three response types:
 * - 200: Immediate result (warm cache)
 * - 202: Async job started, poll until complete
 * - 4xx/5xx: Error
 */
export async function fetchPrice(req: PricingRequest): Promise<PricingResponse> {
  let attempt = 0;
  let delay = INITIAL_DELAY_MS;

  while (attempt < MAX_POLL_ATTEMPTS) {
    const res = await fetch('/api/pricing/price', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    // Success - return immediately
    if (res.status === 200) {
      const data = await res.json();
      return data as PricingResponse;
    }

    // Async job - poll with backoff
    if (res.status === 202) {
      attempt++;
      
      // Check if response includes job info for polling
      const jobData = await res.json() as PricingJobResponse;
      
      if (jobData.status === 'completed' && jobData.result) {
        return jobData.result;
      }
      
      if (jobData.status === 'failed') {
        throw new Error(jobData.error || 'Pricing job failed');
      }

      // Wait with exponential backoff
      await sleep(Math.min(MAX_DELAY_MS, delay));
      delay *= BACKOFF_MULTIPLIER;
      continue;
    }

    // Error response
    const errorText = await res.text();
    throw new Error(
      errorText || `Pricing request failed with status ${res.status}`
    );
  }

  throw new Error(
    `Pricing request timed out after ${MAX_POLL_ATTEMPTS} polling attempts`
  );
}

/**
 * Prefetch price for a given request
 * Useful for warming cache on hover or predicted next action
 */
export async function prefetchPrice(req: PricingRequest): Promise<void> {
  try {
    await fetchPrice(req);
  } catch (error) {
    // Silently fail prefetch - not critical
    console.debug('Prefetch failed:', error);
  }
}

/**
 * Batch fetch multiple pricing requests
 * TODO: Implement server-side batch endpoint for efficiency
 */
export async function fetchPriceBatch(
  requests: PricingRequest[]
): Promise<PricingResponse[]> {
  return Promise.all(requests.map((req) => fetchPrice(req)));
}
