import { Module } from "@nestjs/common";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { NotifyModule } from "../notify/notify.module";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [NotifyModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
