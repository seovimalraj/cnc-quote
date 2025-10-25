import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { InvitesPublicController } from './invites.public.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [InvitesController, InvitesPublicController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
