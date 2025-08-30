import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { QueueModule } from './queues';
import { HealthModule } from './modules/health/health.module';
import { MachineModule } from './modules/machines/machine.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { DfmModule } from './modules/dfm/dfm.module';
import { SupabaseModule } from './lib/supabase/supabase.module';
import { CacheModule } from './lib/cache/cache.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotifyModule } from './modules/notify/notify.module';
import { OrdersModule } from './modules/orders/orders.module';
import { QapModule } from './modules/qap/qap.module';
import { ManualReviewModule } from './modules/manual-review/manual-review.module';
import { ObservabilityModule } from './observability/observability.module';
import { TestModule } from './modules/test/test.module';
import { QueueMonitorModule } from './modules/queue-monitor/queue-monitor.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SupabaseModule,
    CacheModule,
    AuthModule,
    QueueModule,
    ObservabilityModule,
    HealthModule,
    MachineModule,
    PricingModule,
    DfmModule,
    PaymentsModule,
    NotifyModule,
    OrdersModule,
    QapModule,
    ManualReviewModule,
    TestModule,
    QueueMonitorModule,
  ],
})
export class AppModule {}
