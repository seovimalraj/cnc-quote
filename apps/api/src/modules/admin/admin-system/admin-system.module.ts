import { Module } from '@nestjs/common';
import { AdminSystemController, AdminSystemHealthController } from './admin-system.controller';
import { AdminSystemService } from './admin-system.service';
import { AdminHealthModule } from "../admin-health/admin-health.module";

@Module({
  imports: [AdminHealthModule],
  controllers: [AdminSystemController, AdminSystemHealthController],
  providers: [AdminSystemService],
  exports: [AdminSystemService],
})
export class AdminSystemModule {}
