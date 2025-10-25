// @ts-nocheck
/// <reference types="jest" />
jest.mock('../../../modules/auth/rbac.middleware', () => ({
  RbacGuard: () =>
    class {
      canActivate() {
        return true;
      }
    },
}));
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { QuotesModule } from './quotes.module';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { OrgGuard } from '../auth/org.guard';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { NotifyService } from '../notify/notify.service';

// Lightweight module harness focusing on preview endpoint behavior.
// Assumes auth guards bypassed or not applied in this isolated module context.

describe('Quote Preview E2E (risk uplift)', () => {
  let app: INestApplication;
  const supabaseQueryMock = {
    select: () => supabaseQueryMock,
    single: () => ({ data: null, error: null })
  } as any;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [QuotesModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrgGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(SupabaseService)
      .useValue({
        client: {
          from: () => supabaseQueryMock
        }
      })
      .overrideProvider(AnalyticsService)
      .useValue({ track: jest.fn() })
  .overrideProvider(NotifyService)
  .useValue({ send: jest.fn() })
      .overrideProvider(QuotesService)
      .useValue({ createMultiPartQuote: jest.fn(), addPartsToQuote: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  function buildRequest(risk?: number) {
    return {
      currency: 'USD',
      parts: [
        {
          process_code: 'CNC-MILL-3AX',
          material_code: 'ALU-6061-T6',
          finish_codes: ['ANODIZE-CLEAR'],
          quantity: 5,
          volume_cc: 120,
          surface_area_cm2: 300,
          features: { holes: 4, pockets: 2 },
          dfm_risk_score: risk,
        }
      ]
    } as any;
  }

  it('returns price tiers and baseline pricing', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/quotes/preview-multipart')
      .send(buildRequest(0));
  // Controller returns result directly; Nest default for POST may be 201; allow 200 or 201
  expect([200,201]).toContain(res.status);
    expect(res.body.lines[0].price_tiers.length).toBeGreaterThan(0);
  });

  it('applies higher pricing when risk score present', async () => {
    const base = await request(app.getHttpServer()).post('/api/quotes/preview-multipart').send(buildRequest(0));
    const risky = await request(app.getHttpServer()).post('/api/quotes/preview-multipart').send(buildRequest(1));
    const basePrice = base.body.lines[0].unit_price;
    const riskyPrice = risky.body.lines[0].unit_price;
    expect(riskyPrice).toBeGreaterThan(basePrice);
  });
});
