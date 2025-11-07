import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GeometryService } from './geometry.service';
import { GeometryController } from './geometry.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    // SupabaseModule removed - it's @Global
  ],
  controllers: [GeometryController],
  providers: [GeometryService],
  exports: [GeometryService],
})
export class GeometryModule {}
