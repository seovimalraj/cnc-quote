import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { SupabaseModule } from '../lib/supabase/supabase.module';
import { SessionValidationMiddleware } from './session-validation.middleware';
import { SecurityMiddleware } from './security.middleware';

@Module({
  imports: [SupabaseModule],
  providers: [SessionValidationMiddleware, SecurityMiddleware],
  exports: [SessionValidationMiddleware, SecurityMiddleware],
})
export class MiddlewareModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Middleware will be applied per route as needed
  }
}
