import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

interface TestConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiUrl: string;
}

interface TestResult {
  success: boolean;
  testName: string;
  expected: string;
  actual: string;
  error?: any;
  requestId?: string;
}

class RlsChecker {
  private supabase;
  private config: TestConfig;
  private results: TestResult[] = [];

  constructor(config: TestConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  private async loginAsOrg(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Login failed: ${error.message}`);
    }

    return data.session?.access_token;
  }

  private async apiRequest(path: string, token: string) {
    try {
      const response = await axios.get(`${this.config.apiUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });
      return {
        status: response.status,
        data: response.data,
        requestId: response.headers['x-request-id']
      };
    } catch (error: any) {
      if (error.response) {
        return {
          status: error.response.status,
          data: error.response.data,
          requestId: error.response.headers['x-request-id']
        };
      }
      throw error;
    }
  }

  private addResult(testResult: TestResult) {
    this.results.push(testResult);
    // Log result immediately for visibility
    console.log(`[${testResult.success ? 'PASS' : 'FAIL'}] ${testResult.testName}`);
    if (!testResult.success) {
      console.log(`  Expected: ${testResult.expected}`);
      console.log(`  Actual:   ${testResult.actual}`);
      if (testResult.error) {
        console.log(`  Error:    ${JSON.stringify(testResult.error)}`);
      }
    }
  }

  async runTest(
    testName: string,
    resourcePath: string,
    ownerEmail: string,
    ownerPassword: string,
    otherOrgEmail: string,
    otherOrgPassword: string
  ) {
    try {
      // Login as resource owner
      const ownerToken = await this.loginAsOrg(ownerEmail, ownerPassword);
      
      // Test owner access (should succeed)
      const ownerAccess = await this.apiRequest(resourcePath, ownerToken);
      this.addResult({
        testName: `${testName} - Owner Access`,
        success: ownerAccess.status === 200,
        expected: 'HTTP 200',
        actual: `HTTP ${ownerAccess.status}`,
        requestId: ownerAccess.requestId,
        error: ownerAccess.status !== 200 ? ownerAccess.data : undefined
      });

      // Login as other org
      const otherOrgToken = await this.loginAsOrg(otherOrgEmail, otherOrgPassword);
      
      // Test cross-org access (should fail)
      const otherOrgAccess = await this.apiRequest(resourcePath, otherOrgToken);
      this.addResult({
        testName: `${testName} - Cross-Org Access`,
        success: otherOrgAccess.status === 403 && otherOrgAccess.data?.code === 'RLS_DENIED',
        expected: 'HTTP 403 with code=RLS_DENIED',
        actual: `HTTP ${otherOrgAccess.status} with code=${otherOrgAccess.data?.code}`,
        requestId: otherOrgAccess.requestId,
        error: otherOrgAccess.data
      });

    } catch (error) {
      this.addResult({
        testName,
        success: false,
        expected: 'Test to complete',
        actual: 'Test threw an error',
        error
      });
    }
  }

  getResults() {
    return {
      success: this.results.every(r => r.success),
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.success).length,
      results: this.results
    };
  }
}

export { RlsChecker, type TestConfig, type TestResult };
