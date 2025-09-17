import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";
import { SupabaseModule } from "../lib/supabase/supabase.module";
import { JwtAuthGuard } from "./jwt.guard";
import { DfmAuthGuard } from "./dfm-auth.guard";
import { OrgGuard } from "./org.guard";
import { RolesGuard } from "./roles.guard";

@Module({
  imports: [PassportModule.register({ defaultStrategy: "jwt" }), SupabaseModule],
  providers: [JwtStrategy, JwtAuthGuard, DfmAuthGuard, OrgGuard, RolesGuard],
  exports: [PassportModule, JwtAuthGuard, DfmAuthGuard, OrgGuard, RolesGuard],
})
export class AuthModule {}
