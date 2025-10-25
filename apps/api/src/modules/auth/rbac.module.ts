import { Global, Module } from '@nestjs/common';
import { PolicyEngine } from './policy.engine';
import { SupabaseModule } from '../../lib/supabase/supabase.module';
import { PolicySeeder } from './policies.seed';

@Global()
@Module({
  imports: [SupabaseModule],
  providers: [PolicyEngine, PolicySeeder],
  exports: [PolicyEngine],
})
export class RbacModule {}
