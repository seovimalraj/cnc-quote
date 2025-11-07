import { Module } from '@nestjs/common';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { InvitesPublicController } from './invites.public.controller';

@Module({
  imports: [], // SupabaseModule removed - it's @Global
  controllers: [InvitesController, InvitesPublicController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}
