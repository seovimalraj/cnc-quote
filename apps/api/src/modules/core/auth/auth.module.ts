import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { JwtAuthGuard } from "./jwt.guard";
import { DfmAuthGuard } from "./dfm-auth.guard";
import { OrgGuard } from "./org.guard";
import { RolesGuard } from "./roles.guard";
import { PoliciesGuard } from "./policies.guard";
import { AuthService } from "./auth.service";
import { NotifyModule } from "../../features/notify/notify.module";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), SupabaseModule, NotifyModule],
  providers: [JwtStrategy, JwtAuthGuard, DfmAuthGuard, OrgGuard, RolesGuard, PoliciesGuard, AuthService],
  exports: [PassportModule, JwtAuthGuard, DfmAuthGuard, OrgGuard, RolesGuard, PoliciesGuard, AuthService],
})
export class AuthModule {}
