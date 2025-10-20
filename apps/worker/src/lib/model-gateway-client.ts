/**
 * @module worker/lib/model-gateway-client
 * @ownership ai-platform
 * HTTPS client for communicating with the secured model gateway. Handles mutual TLS configuration
 * and short-lived JWT service tokens signed from the rotating keyset supplied via environment.
 */

import axios, { AxiosInstance } from 'axios';
import https from 'https';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { config } from '../config.js';
import { logger } from './logger.js';

interface KeysetEntry {
  kid: string;
  privateKey: string;
  alg?: string;
}

interface KeysetDocument {
  keys: KeysetEntry[];
}

interface TokenCache {
  token: string;
  expiresAt: number; // epoch seconds
}

let client: ModelGatewayClient | null = null;

export class ModelGatewayClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly keyset: Record<string, KeysetEntry>;
  private tokenCache: TokenCache | null = null;

  constructor() {
    this.keyset = this.loadKeyset(config.modelServiceKeyset);
    const httpsAgent = this.buildHttpsAgent();
    this.axiosInstance = axios.create({
      baseURL: config.modelGatewayUrl,
      timeout: config.ollamaTimeoutMs,
      httpsAgent,
    });
  }

  async chat<TResponse>(body: unknown, traceId?: string): Promise<TResponse> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (traceId) {
      headers['X-Trace-Id'] = traceId;
    }

    const response = await this.axiosInstance.post<TResponse>('/api/chat', body, { headers });
    return response.data;
  }

  async control(action: 'retrain' | 'rollback', body: unknown, traceId?: string): Promise<void> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (traceId) {
      headers['X-Trace-Id'] = traceId;
    }

    await this.axiosInstance.post(`/control/${action}`, body, { headers });
  }

  private loadKeyset(raw: string): Record<string, KeysetEntry> {
    let parsed: KeysetDocument;
    try {
      parsed = JSON.parse(raw) as KeysetDocument;
    } catch (error) {
      throw new Error('MODEL_SERVICE_KEYSET must be valid JSON');
    }

    if (!Array.isArray(parsed.keys) || parsed.keys.length === 0) {
      throw new Error('MODEL_SERVICE_KEYSET must contain at least one key entry');
    }

    const registry: Record<string, KeysetEntry> = {};
    parsed.keys.forEach((entry) => {
      if (!entry.kid || !entry.privateKey) {
        throw new Error('MODEL_SERVICE_KEYSET entries require kid and privateKey');
      }
      registry[entry.kid] = {
        kid: entry.kid,
        privateKey: entry.privateKey,
        alg: entry.alg ?? 'RS256',
      };
    });
    return registry;
  }

  private buildHttpsAgent(): https.Agent | undefined {
    const certPath = config.modelGatewayClientCertPath;
    const keyPath = config.modelGatewayClientKeyPath;
    const caPath = config.modelGatewayCaPath;

    if (!certPath && !keyPath && !caPath) {
      return undefined;
    }

    const options: https.AgentOptions = {};
    if (certPath) {
      options.cert = fs.readFileSync(path.resolve(certPath));
    }
    if (keyPath) {
      options.key = fs.readFileSync(path.resolve(keyPath));
    }
    if (caPath) {
      options.ca = fs.readFileSync(path.resolve(caPath));
    }

    options.rejectUnauthorized = true;
    return new https.Agent(options);
  }

  private getToken(): string {
    const now = Math.floor(Date.now() / 1000);
    if (this.tokenCache && this.tokenCache.expiresAt - 5 > now) {
      return this.tokenCache.token;
    }

    const key = this.keyset[config.modelServiceActiveKeyId];
    if (!key) {
      throw new Error(`Active key ${config.modelServiceActiveKeyId} missing from keyset`);
    }

    if (key.alg !== 'RS256') {
      throw new Error(`Unsupported signing algorithm ${key.alg ?? 'unknown'}`);
    }

    const iat = now;
    const exp = iat + config.modelServiceTokenTtlSeconds;
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: key.kid,
    };
    const payload = {
      iss: config.modelServiceIssuer,
      aud: config.modelServiceAudience,
      sub: 'cnc-quote-worker',
      iat,
      exp,
      jti: randomUUID(),
    };

    const token = this.signJwt(header, payload, key.privateKey);
    this.tokenCache = {
      token,
      expiresAt: exp,
    };

    logger.debug({ kid: key.kid, exp }, 'Issued model gateway service token');

    return token;
  }

  private signJwt(header: Record<string, unknown>, payload: Record<string, unknown>, privateKey: string): string {
    const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
    const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
    const signingInput = `${encodedHeader}.${encodedPayload}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    const signature = signer.sign(privateKey);
    const encodedSignature = base64UrlEncode(signature);

    return `${signingInput}.${encodedSignature}`;
  }
}

export function getModelGatewayClient(): ModelGatewayClient {
  if (!client) {
    client = new ModelGatewayClient();
  }
  return client;
}

function base64UrlEncode(input: Buffer | string): string {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
