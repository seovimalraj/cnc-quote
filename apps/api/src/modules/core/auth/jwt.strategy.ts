import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Role, ROLES } from "@cnc-quote/shared";

export interface JwtPayload {
  sub: string;
  userId?: string;
  email: string;
  org_id?: string;
  organizationId?: string;
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
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => {
          // Also check cookies for browser requests
          if (req && req.cookies) {
            return req.cookies['sb-access-token'];
          }
          return null;
        },
      ]),
      secretOrKey: process.env.JWT_SECRET || 'CvLsEGE0l29M+R1s6OcSm8r8We3JI7C9Gyox2fheQ4I=',
      algorithms: ["HS256"],
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const resolveRole = (value: unknown): Role | undefined =>
      typeof value === 'string' && (ROLES as string[]).includes(value)
        ? (value as Role)
        : undefined;

    const resolvedRole = resolveRole(payload.role);
    const userId = payload.sub || payload.userId;
    const orgId = payload.org_id || payload.organizationId;

    return {
      sub: userId,
      userId: userId,
      email: payload.email,
      org_id: orgId,
      role: resolvedRole ?? 'user',
      last_org_id: payload.last_org_id ?? null,
      default_org_id: payload.default_org_id ?? null,
    };
  }
}
