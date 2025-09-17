import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { NotifyModule } from '../notify/notify.module';
import { AuthModule as AuthGuardsModule } from '../../auth/auth.module';

@Module({
  imports: [NotifyModule, AuthGuardsModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
