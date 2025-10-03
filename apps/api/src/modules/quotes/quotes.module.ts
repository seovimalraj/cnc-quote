import { Module } from "@nestjs/common";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import { QuotePreviewService } from './quote-preview.service';
import { QuoteRevisionsService } from './quote-revisions.service';
import { SupabaseModule } from "../../lib/supabase/supabase.module";
import { AnalyticsModule } from "../analytics/analytics.module";
import { NotifyModule } from "../notify/notify.module";

@Module({
  imports: [SupabaseModule, AnalyticsModule, NotifyModule],
  controllers: [QuotesController],
  providers: [QuotesService, QuotePreviewService, QuoteRevisionsService],
  exports: [QuotesService],
})
export class QuotesModule {}
