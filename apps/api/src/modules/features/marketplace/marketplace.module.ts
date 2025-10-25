/**
 * Step 17: Marketplace Module
 * NestJS module for suppliers and routing
 */

import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { SupplierProfileController } from './supplier-profile.controller';
import { SupplierQuotesController } from './supplier-quotes.controller';
import { SupplierQuotesService } from './supplier-quotes.service';
import { RoutingController, OrdersRoutingController } from './routing.controller';
import { RoutingService } from './routing.service';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { AuditModule } from "../../legacy/audit-legacy/audit.module";
// import { EventsModule } from "../../websockets/events/events.module"; // TODO: Implement WebSocket events module

@Module({
  imports: [SupabaseModule, AuditModule /*, EventsModule */],
  controllers: [
    SuppliersController,
    SupplierProfileController,
    SupplierQuotesController,
    RoutingController,
    OrdersRoutingController,
  ],
  providers: [SuppliersService, SupplierQuotesService, RoutingService],
  exports: [SuppliersService, SupplierQuotesService, RoutingService],
})
export class MarketplaceModule {}
