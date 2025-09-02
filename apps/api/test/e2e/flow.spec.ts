import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../src/app.module";

describe("AppController (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("End-to-end Quote Flow", () => {
    let quoteId: string;
    let _sessionId: string;

    const mockFile = {
      originalname: "test-part.stl",
      buffer: Buffer.from("fake STL data"),
      mimetype: "application/vnd.ms-pki.stl",
    };

    it("should upload a file and start quote process", () => {
      return request(app.getHttpServer())
        .post("/api/files/upload")
        .attach("file", mockFile.buffer, mockFile.originalname)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty("fileId");
          expect(res.body).toHaveProperty("previewUrl");
        });
    });

    it("should analyze part and return DFM results", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/dfm/analyze")
        .send({
          fileId: "test-file-id",
          material: "alu-6061",
        })
        .expect(200);

      expect(res.body).toHaveProperty("manufacturabilityScore");
      expect(res.body).toHaveProperty("issues");
      expect(res.body).toHaveProperty("estimatedLeadTime");
    });

    it("should generate pricing for valid quantity", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/pricing/calculate")
        .send({
          fileId: "test-file-id",
          material: "alu-6061",
          quantity: 10,
          features: {
            surfaceFinish: "as-machined",
            tolerance: "standard",
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty("pricePerUnit");
      expect(res.body).toHaveProperty("totalPrice");
      expect(res.body).toHaveProperty("leadTime");
    });

    it("should create a quote", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/quotes")
        .send({
          fileId: "test-file-id",
          material: "alu-6061",
          quantity: 10,
          features: {
            surfaceFinish: "as-machined",
            tolerance: "standard",
          },
          customerEmail: "test@example.com",
          customerName: "Test User",
        })
        .expect(201);

      expect(res.body).toHaveProperty("quoteId");
      expect(res.body).toHaveProperty("status", "pending");
      quoteId = res.body.quoteId;
    });

    it("should create an order when quote is accepted", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/quotes/${quoteId}/accept`)
        .send({
          paymentMethod: "stripe",
          billingAddress: {
            line1: "123 Test St",
            city: "Test City",
            state: "TS",
            postal_code: "12345",
            country: "US",
          },
          shippingAddress: {
            line1: "123 Test St",
            city: "Test City",
            state: "TS",
            postal_code: "12345",
            country: "US",
          },
        })
        .expect(200);

      expect(res.body).toHaveProperty("orderId");
      expect(res.body).toHaveProperty("paymentUrl");
    });
  });
});
