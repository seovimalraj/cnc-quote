/**
 * Process Recommendation End-to-End Test (Step 10)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { RecommenderController } from '../recommender.controller';
import { RecommenderService } from '../recommender.service';
import { RateLimitService } from '../../lib/rate-limit/rate-limit.service';
import { CacheService } from '../../lib/cache/cache.service';
import { RecommendRequest, ProcessRecommendationResponse } from '../types';

describe('RecommenderController (e2e)', () => {
  let controller: RecommenderController;
  let service: RecommenderService;

  beforeEach(async () => {
    const mockService = {
      recommendProcesses: jest.fn().mockResolvedValue({
        recommendations: [
          {
            process: 'turning',
            confidence: 0.85,
            reasons: ['Rotational symmetry detected'],
            decision_vector: {
              rules_fired: ['TURNING_GEOM_AXIS'],
              scores: { geometry_fit: 0.6, feature_match: 0.3, constraint_penalty: 0, user_intent_bonus: 0 },
            },
            blocking_constraints: [],
            metadata: {},
          },
        ],
        version: 'v0.1',
        generated_at: new Date().toISOString(),
      }),
    };

    const mockRateLimit = {
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
    };

    const mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecommenderController],
      providers: [
        { provide: RecommenderService, useValue: mockService },
        { provide: RateLimitService, useValue: mockRateLimit },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    controller = module.get<RecommenderController>(RecommenderController);
    service = module.get<RecommenderService>(RecommenderService);
  });

  it('should return sorted recommendations with reasons', async () => {
    const request: RecommendRequest = {
      quote_id: '123e4567-e89b-12d3-a456-426614174000',
      part_id: '123e4567-e89b-12d3-a456-426614174001',
    };

    const req = {
      rbac: { orgId: 'org-123' },
      headers: { 'x-trace-id': 'test-trace-123' },
    };

    const result: ProcessRecommendationResponse = await controller.recommend(req, request);

    expect(result.recommendations).toHaveLength(1);
    expect(result.recommendations[0].process).toBe('turning');
    expect(result.recommendations[0].confidence).toBe(0.85);
    expect(result.recommendations[0].reasons).toContain('Rotational symmetry detected');
    expect(service.recommendProcesses).toHaveBeenCalledWith(request, 'org-123', 'test-trace-123');
  });
});
