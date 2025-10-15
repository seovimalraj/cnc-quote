import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { JwtAuthGuard } from '../../src/auth/jwt.guard';
import { OrgGuard } from '../../src/auth/org.guard';
import { PoliciesGuard } from '../../src/auth/policies.guard';
import { QuotesController } from '../../src/modules/quotes/quotes.controller';
import { QuotesService } from '../../src/modules/quotes/quotes.service';
import { QuotePreviewService } from '../../src/modules/quotes/quote-preview.service';
import { QuoteRevisionsService } from '../../src/modules/quotes/quote-revisions.service';

export async function createNestApp(overrides: {
  quotesService?: Partial<QuotesService>;
  quotePreviewService?: Partial<QuotePreviewService>;
  quoteRevisionsService?: Partial<QuoteRevisionsService>;
} = {}): Promise<INestApplication> {
  const defaultQuotesService: Partial<QuotesService> = {
    createMultiPartQuote: async () => ({} as any),
    addPartsToQuote: async () => ({} as any),
    createQuoteFromDfm: async () => ({} as any),
    getQuote: async () => ({} as any),
    getQuoteSummaryV1: async () => ({} as any),
    getQuoteSummaryVNext: async () => ({} as any),
    updateQuote: async () => ({} as any),
    generatePdf: async () => Buffer.from([]),
    sendQuote: async () => ({} as any),
    transitionQuoteStatus: async () => ({} as any),
  };

  const quotesServiceMock = { ...defaultQuotesService, ...overrides.quotesService } as Partial<QuotesService>;
  const previewServiceMock = overrides.quotePreviewService ?? { preview: async () => ({}) };
  const revisionsServiceMock = overrides.quoteRevisionsService ?? { fetchRevisions: async () => ({}) };

  const testingModuleBuilder = Test.createTestingModule({
    controllers: [QuotesController],
    providers: [
      { provide: QuotesService, useValue: quotesServiceMock },
      { provide: QuotePreviewService, useValue: previewServiceMock },
      { provide: QuoteRevisionsService, useValue: revisionsServiceMock },
    ],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(OrgGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(PoliciesGuard)
    .useValue({ canActivate: () => true });

  const moduleRef = await testingModuleBuilder.compile();
  const controller = moduleRef.get<QuotesController>(QuotesController);
  Object.assign(controller as any, {
    quotesService: quotesServiceMock,
    previewService: previewServiceMock,
    revisionsService: revisionsServiceMock,
  });

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}
