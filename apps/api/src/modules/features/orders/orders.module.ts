import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { NotifyModule } from '../notify/notify.module';

@Module({
  imports: [NotifyModule], // QapModule removed - QapProcessor doesn't inherit WorkerHost
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
