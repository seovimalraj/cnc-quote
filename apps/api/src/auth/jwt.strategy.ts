import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { passportJwtSecret } from "jwks-rsa";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Role, ROLES } from "@cnc-quote/shared";

export interface JwtPayload {
  sub: string;
  email: string;
  org_id?: string;
  aud?: string;
  role?: Role | "user";
  iss?: string;
  last_org_id?: string | null;
  default_org_id?: string | null;
}

export interface RequestUser {
  /** Canonical subject identifier (JWT sub) */
  sub: string;
  /** Legacy alias consumed by existing services */
  userId: string;
  email: string;
  org_id?: string;
  role?: Role | "user";
  last_org_id?: string | null;
  default_org_id?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly supabase: SupabaseClient;

  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: process.env.JWT_AUDIENCE,
      issuer: `${process.env.SUPABASE_URL}/auth/v1`,
      algorithms: ["RS256"],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${process.env.SUPABASE_URL}/auth/v1/jwks`,
      }),
    });

    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    // Fetch user role from database
    const { data: user } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', payload.sub)
      .single();

    const resolveRole = (value: unknown): Role | undefined =>
      typeof value === 'string' && (ROLES as string[]).includes(value)
        ? (value as Role)
        : undefined;

    const resolvedRole = resolveRole(user?.role) ?? resolveRole(payload.role);

    return {
      sub: payload.sub,
      userId: payload.sub,
      email: payload.email,
      org_id: payload.org_id,
      role: resolvedRole ?? 'user',
      last_org_id: payload.last_org_id ?? null,
      default_org_id: payload.default_org_id ?? null,
    };
  }
}
