import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Quote to Order Flow (e2e)', () => {
  let app: INestApplication;
  let supabase;
  let authToken: string;

  beforeAll(async () => {
    // Create test app
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Initialize Supabase
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    // Get auth token
    const { data: { session } } = await supabase.auth.signInWithPassword({
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'test123',
    });

    authToken = session!.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should complete full quote to order flow', async () => {
    // Step 1: Upload CAD file
    const fileContent = await fs.readFile(
      path.join(__dirname, '../test-files/bracket.step')
    );
    
    const uploadResponse = await request(app.getHttpServer())
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', fileContent, 'bracket.step');

    expect(uploadResponse.status).toBe(201);
    const fileId = uploadResponse.body.id;

    // Step 2: Trigger CAD analysis
    const analysisResponse = await request(app.getHttpServer())
      .post('/api/cad/analyze')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ fileId });

    expect(analysisResponse.status).toBe(202);
    const jobId = analysisResponse.body.jobId;

    // Wait for analysis completion
    while (true) {
      const { data: file } = await supabase
        .from('files')
        .select('cad_metrics')
        .eq('id', fileId)
        .single();

      if (file?.cad_metrics) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 3: Get price
    const priceResponse = await request(app.getHttpServer())
      .post('/api/price')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        file_id: fileId,
        material_id: 'MAT_AL_6061',
        quantity: 10,
        process: 'CNC'
      });

    expect(priceResponse.status).toBe(200);
    expect(priceResponse.body.unit_price).toBeGreaterThan(0);

    // Step 4: Create quote
    const quoteResponse = await request(app.getHttpServer())
      .post('/api/quotes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        file_id: fileId,
        material_id: 'MAT_AL_6061',
        quantity: 10,
        process: 'CNC'
      });

    expect(quoteResponse.status).toBe(201);
    const quoteId = quoteResponse.body.id;

    // Step 5: Accept quote
    const acceptResponse = await request(app.getHttpServer())
      .post(`/api/quotes/${quoteId}/accept`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({});

    expect(acceptResponse.status).toBe(200);

    // Step 6: Create checkout session
    const checkoutResponse = await request(app.getHttpServer())
      .post(`/api/payments/create-session`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        quote_id: quoteId
      });

    expect(checkoutResponse.status).toBe(200);
    expect(checkoutResponse.body.url).toContain('checkout.stripe.com');

    // Step 7: Simulate webhook
    const stripeEvent = {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_test',
          amount: priceResponse.body.unit_price * 10 * 100,
          currency: 'usd',
          metadata: {
            quote_id: quoteId
          }
        }
      }
    };

    const webhookResponse = await request(app.getHttpServer())
      .post('/api/payments/stripe/webhook')
      .set('Stripe-Signature', 'test_signature')
      .send(stripeEvent);

    expect(webhookResponse.status).toBe(200);

    // Step 8: Verify order creation
    while (true) {
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('quote_id', quoteId)
        .single();

      if (order) {
        expect(order.status).toBe('new');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  });
});
