import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { SupabaseModule } from "../lib/supabase/supabase.module";
import { JwtAuthGuard } from "./jwt.guard";
import { DfmAuthGuard } from "./dfm-auth.guard";
import { OrgGuard } from "./org.guard";
import { RolesGuard } from "./roles.guard";
import { PoliciesGuard } from "./policies.guard";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), SupabaseModule],
  providers: [JwtStrategy, JwtAuthGuard, DfmAuthGuard, OrgGuard, RolesGuard, PoliciesGuard],
  exports: [PassportModule, JwtAuthGuard, DfmAuthGuard, OrgGuard, RolesGuard, PoliciesGuard],
})
export class AuthModule {}
