import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminRiskComplianceService } from './admin-risk-compliance.service';
import { AdminFinishOperationsController } from './admin-finish-operations.controller';
import { FinishesModule } from "../domain/finishes/finishes.module";
import { FormulaModule } from "../../lib/common/formula/formula.module";
// AdminMetricsModule removed - has DI issues
import { SupabaseModule } from "../../lib/supabase/supabase.module";

@Module({
  imports: [FinishesModule, FormulaModule], // AdminMetricsModule removed, SupabaseModule removed (it's @Global)
  controllers: [AdminController, AdminFinishOperationsController],
  providers: [AdminService, AdminRiskComplianceService],
  exports: [AdminService],
})
export class AdminModule {}
