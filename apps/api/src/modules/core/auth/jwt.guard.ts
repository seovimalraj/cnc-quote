import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import type { Observable } from "rxjs";

type RequestUser = {
  sub: string;
  userId: string;
  email?: string;
  org_id?: string;
  role?: string;
  last_org_id?: string | null;
  default_org_id?: string | null;
};

function base64urlDecode(input: string): string {
  // Replace URL-safe chars and pad
  const pad = input.length % 4 === 2 ? '==' : input.length % 4 === 3 ? '=' : '';
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function verifyHs256(token: string, secret: string): { valid: boolean; payload?: any } {
  try {
    const [headerB64, payloadB64, signature] = token.split('.');
    if (!headerB64 || !payloadB64 || !signature) return { valid: false };
    const headerJson = base64urlDecode(headerB64);
    const header = JSON.parse(headerJson);
    if (header.alg !== 'HS256') return { valid: false };
    const crypto = require('crypto');
    const data = `${headerB64}.${payloadB64}`;
    const expected = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    if (expected !== signature) return { valid: false };
    const payloadJson = base64urlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);
    // Optional exp check
    if (typeof payload.exp === 'number' && Date.now() / 1000 > payload.exp) {
      return { valid: false };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false };
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;

    if (!token) {
      return false;
    }

    // Support HS256 demo tokens from web sign-in
    const secret = process.env.JWT_SECRET || 'cnc-quote-jwt-secret-key-2024-production-ready';
    const { valid, payload } = verifyHs256(token, secret);

    if (valid && payload) {
      const user: RequestUser = {
        sub: (payload.sub as string) || (payload.userId as string),
        userId: (payload.userId as string) || (payload.sub as string),
        email: payload.email as string | undefined,
        org_id:
          (payload.org_id as string | undefined) ||
          (payload.orgId as string | undefined) ||
          (payload.organizationId as string | undefined),
        role: (payload.role as string | undefined) || 'user',
        last_org_id: (payload.last_org_id as string | null | undefined) ?? null,
        default_org_id: (payload.default_org_id as string | null | undefined) ?? null,
      };
      request.user = user;
      return true;
    }

    // Fallback: accept any token but do not attach user (will be blocked by OrgGuard/PoliciesGuard)
    return false;
  }
}
