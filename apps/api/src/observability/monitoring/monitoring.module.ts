import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { MonitoringController } from './monitoring.controller';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [MonitoringController],
})
export class MonitoringModule {}
