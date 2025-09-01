import { Module } from "@nestjs/common";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { NotifyModule } from "../notify/notify.module";
import { QapModule } from "../qap/qap.module";

@Module({
  imports: [NotifyModule, QapModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
