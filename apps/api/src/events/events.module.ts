/**
 * Step 17: Events Module
 * Exports EventsGateway for WebSocket events
 */

import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
