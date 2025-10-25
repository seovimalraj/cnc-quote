import { Module } from '@nestjs/common';
import { OrgsController } from './orgs.controller';
import { OrgsService } from './orgs.service';
import { SupabaseModule } from "../../../lib/supabase/supabase.module";
import { InvitesModule } from "../invites/invites.module";

@Module({
  imports: [SupabaseModule, InvitesModule],
  controllers: [OrgsController],
  providers: [OrgsService],
  exports: [OrgsService],
})
export class OrgsModule {}
