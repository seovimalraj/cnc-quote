import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { MachinesService } from './machines.service';
import { MachinesController } from './machines.controller';
import { MaterialsService } from './materials.service';
import { MaterialsController } from './materials.controller';
import { FinishesService } from './finishes.service';
import { FinishesController } from './finishes.controller';
import { InspectionTemplatesService } from './inspection-templates.service';
import { InspectionTemplatesController } from './inspection-templates.controller';
import { QapTemplatesService } from './qap-templates.service';
import { QapTemplatesController } from './qap-templates.controller';
import { SupabaseModule } from "../../lib/supabase/supabase.module";
import { CacheModule } from "../../lib/cache/cache.module";

@Module({
  imports: [SupabaseModule, CacheModule],
  controllers: [
    CatalogController,
    MachinesController,
    MaterialsController,
    FinishesController,
    InspectionTemplatesController,
    QapTemplatesController,
  ],
  providers: [
    CatalogService,
    MachinesService,
    MaterialsService,
    FinishesService,
    InspectionTemplatesService,
    QapTemplatesService,
  ],
  exports: [
    CatalogService,
    MachinesService,
    MaterialsService,
    FinishesService,
    InspectionTemplatesService,
    QapTemplatesService,
  ],
})
export class CatalogModule {}
