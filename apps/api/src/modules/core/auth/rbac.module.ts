import { Global, Module } from '@nestjs/common';
import { PolicyEngine } from './policy.engine';
import { PolicySeeder } from './policies.seed';

@Global()
@Module({
  imports: [], // SupabaseModule removed - it's @Global
  providers: [PolicyEngine, PolicySeeder],
  exports: [PolicyEngine],
})
export class RbacModule {}
