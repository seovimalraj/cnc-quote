import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminFinishOperationsController } from './admin-finish-operations.controller';
import { FinishesModule } from '../finishes/finishes.module';
import { FormulaModule } from '../../common/formula/formula.module';

@Module({
  imports: [FinishesModule, FormulaModule],
  controllers: [AdminController, AdminFinishOperationsController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
