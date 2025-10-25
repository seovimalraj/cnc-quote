// @ts-nocheck
/// <reference types="jest" />
// Jest globals provided by @types/jest v29
import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { AuthService } from "../../core/auth/auth.service";
import { CreateLeadDto } from './dto/create-lead.dto';

describe('LeadsService', () => {
  let service: LeadsService;
  // supabaseService not directly used; kept for potential future assertions
  // let supabaseService: SupabaseService;

  // Custom queued response mock to emulate Supabase query builder + await semantics
  const generalResponses: any[] = []; // for queries awaited without .single()
  const singleResponses: any[] = [];  // for queries ending in .single()
  const builder: any = {
    from: () => builder,
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    eq: () => builder,
    gte: () => builder,
    single: () => {
      const resp = singleResponses.shift() || { data: null, error: null };
      return Promise.resolve(resp);
    },
    then: (resolve: any) => {
      const resp = generalResponses.shift() || { data: [], error: null };
      return Promise.resolve(resolve(resp));
    },
    auth: {
      admin: {
        createUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-auth-123' } }, error: null })
      }
    }
  };
  const mockSupabaseClient: any = builder;

  const mockAuthService = {
    sendInvite: jest.fn().mockResolvedValue({ inviteId: 'invite-123', sessionToken: 'session-token-abc' })
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: SupabaseService, useValue: { client: mockSupabaseClient } },
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLead', () => {
    const createLeadDto: CreateLeadDto = {
      email: 'test@company.com',
      phone: '+1234567890',
      dfm_request_id: 'dfm-123'
    };

    const mockIp = '192.168.1.1';

    it('should create a new lead successfully', async () => {
      // Queue responses in order of service queries
      // 1 rate limit (general await) -> empty array
      generalResponses.push({ data: [], error: null });
      // 2 existing lead .single()
      singleResponses.push({ data: null, error: { code: 'PGRST116' } });
      // 3 insert lead .single()
      singleResponses.push({ data: { id: 'lead-123' }, error: null });
      // 4 invite lookup .single()
      singleResponses.push({ data: { user_id: 'user-123', organization_id: 'org-123' }, error: null });

      const result = await service.createLead(createLeadDto, mockIp);
      expect(result).toMatchObject({ lead_id: 'lead-123', user_id: 'user-123', organization_id: 'org-123' });
      expect(result.session_token).toMatch(/^lead_lead-123_/);
    });

    it('should return existing lead if already exists', async () => {
      const existingLead = { id: 'existing-lead-123', user_id: 'existing-user-123', organization_id: 'existing-org-123' };
      generalResponses.push({ data: [], error: null }); // rate limit
      singleResponses.push({ data: existingLead, error: null }); // existing lead

      const result = await service.createLead(createLeadDto, mockIp);
      expect(result.lead_id).toBe('existing-lead-123');
      expect(result.session_token).toMatch(/^lead_existing-lead-123_/);
    });

    it('should throw error for rate limit exceeded', async () => {
      const recentSubmissions = new Array(5).fill(0).map((_,i)=>({ id: `${i}` }));
      generalResponses.push({ data: recentSubmissions, error: null }); // rate limit triggers
      await expect(service.createLead(createLeadDto, mockIp)).rejects.toThrow('Too many submissions');
    });

    it('should throw error for invalid email', async () => {
      const invalidDto = { ...createLeadDto, email: 'invalid-email' };
      await expect(service.createLead(invalidDto as any, mockIp)).rejects.toThrow('Invalid email');
    });
  });
});
