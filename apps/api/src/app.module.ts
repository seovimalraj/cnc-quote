import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { HealthModule } from "./modules/health/health.module";
import { SupabaseModule } from "./lib/supabase/supabase.module";
import { CacheModule } from "./lib/cache/cache.module";
import { TestModule } from "./modules/test/test.module";
import { QueueModule } from "./queues";
import { RbacModule } from './modules/auth/rbac.module';
import { AuthModule } from './modules/auth/auth.module';
import { AIModule } from './modules/ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    HealthModule,
    TestModule,
    CacheModule,
    QueueModule,
    RbacModule,
    AuthModule,
    AIModule, // Test if AIModule causes the issue
  ],
})
export class AppModule {}
