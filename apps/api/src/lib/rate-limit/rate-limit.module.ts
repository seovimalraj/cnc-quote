import { Module } from "@nestjs/common";
import { ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerBehindProxyGuard } from "./rate-limit.guard";
import { RateLimitService } from "./rate-limit.service";
import { SupabaseService } from "../supabase/supabase.service";

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    RateLimitService,
    SupabaseService,
  ],
  exports: [RateLimitService],
})
export class RateLimitModule {}
