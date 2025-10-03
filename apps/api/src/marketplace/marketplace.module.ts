/**
 * Step 17: Marketplace Module
 * NestJS module for suppliers and routing
 */

import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { RoutingController, OrdersRoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [SupabaseModule, AuditModule, EventsModule],
  controllers: [SuppliersController, RoutingController, OrdersRoutingController],
  providers: [SuppliersService, RoutingService],
  exports: [SuppliersService, RoutingService],
})
export class MarketplaceModule {}
