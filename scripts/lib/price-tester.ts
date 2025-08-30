import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

interface PricingResponse {
  unit_price: number;
  breakdown: Record<string, number>;
  estimate_level: 'fast' | 'refined';
  request_id: string;
  latency_ms: number;
}

interface TestResult {
  process: string;
  success: boolean;
  latency_ms: number;
  request_id: string;
  unit_price: number;
  estimate_level: string;
  error?: any;
}

export class PriceTester {
  private apiUrl: string;
  private token: string;

  constructor(apiUrl: string, token: string) {
    this.apiUrl = apiUrl;
    this.token = token;
  }

  private async makeRequest(payload: any): Promise<PricingResponse> {
    const startTime = process.hrtime();
    
    const response = await axios.post(
      `${this.apiUrl}/api/price`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const latencyMs = (seconds * 1000) + (nanoseconds / 1000000);

    return {
      ...response.data,
      latency_ms: latencyMs,
      request_id: response.headers['x-request-id']
    };
  }

  async runTest(process: string, payload: any): Promise<TestResult> {
    try {
      const result = await this.makeRequest(payload);

      // Validate response
      const success = 
        result.unit_price > 0 && 
        result.breakdown !== undefined &&
        ['fast', 'refined'].includes(result.estimate_level) &&
        result.latency_ms < 300;

      return {
        process,
        success,
        latency_ms: result.latency_ms,
        request_id: result.request_id,
        unit_price: result.unit_price,
        estimate_level: result.estimate_level
      };

    } catch (error: any) {
      return {
        process,
        success: false,
        latency_ms: -1,
        request_id: error.response?.headers?.['x-request-id'] || 'unknown',
        unit_price: -1,
        estimate_level: 'error',
        error: {
          status: error.response?.status,
          data: error.response?.data
        }
      };
    }
  }

  static async writeResults(results: TestResult[], outputDir: string) {
    for (const result of results) {
      const filename = `price-${result.process.toLowerCase()}.json`;
      await fs.writeFile(
        path.join(outputDir, filename),
        JSON.stringify(result, null, 2)
      );
    }
  }
}
