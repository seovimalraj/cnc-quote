import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { passportJwtSecret } from "jwks-rsa";
import { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

export interface JwtPayload {
  sub: string;
  email: string;
  org_id?: string;
  aud?: string;
  role?: string;
  iss?: string;
}

export interface RequestUser {
  userId: string;
  email: string;
  org_id?: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private supabase: SupabaseClient;

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

    return {
      userId: payload.sub,
      email: payload.email,
      org_id: payload.org_id,
      role: user?.role || 'user',
    };
  }
}
