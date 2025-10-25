import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GeometryService } from './geometry.service';
import { GeometryController } from './geometry.controller';
import { SupabaseModule } from '../../../lib/supabase/supabase.module';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    SupabaseModule,
  ],
  controllers: [GeometryController],
  providers: [GeometryService],
  exports: [GeometryService],
})
export class GeometryModule {}
