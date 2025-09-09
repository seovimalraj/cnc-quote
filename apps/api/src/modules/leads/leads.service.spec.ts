import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { SupabaseService } from '../../lib/supabase/supabase.service';
import { CreateLeadDto } from './dto/create-lead.dto';

describe('LeadsService', () => {
  let service: LeadsService;
  let supabaseService: SupabaseService;

  const mockSupabaseClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    single: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: SupabaseService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockSupabaseClient)
          }
        }
      ]
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
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
      // Mock no existing submissions (rate limit check)
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // Mock no existing lead
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // Mock lead creation
      mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'lead-123' }, error: null });

      // Mock prospects organization lookup
      mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'org-123' }, error: null });

      // Mock no existing user
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // Mock user creation
      mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'user-123' }, error: null });

      const result = await service.createLead(createLeadDto, mockIp);

      expect(result).toEqual({
        lead_id: 'lead-123',
        user_id: 'user-123',
        organization_id: 'org-123',
        session_token: expect.stringContaining('lead_lead-123_')
      });
    });

    it('should return existing lead if already exists', async () => {
      const existingLead = {
        id: 'existing-lead-123',
        user_id: 'existing-user-123',
        organization_id: 'existing-org-123'
      };

      // Mock no recent submissions
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

      // Mock existing lead
      mockSupabaseClient.single.mockResolvedValueOnce({ data: existingLead, error: null });

      const result = await service.createLead(createLeadDto, mockIp);

      expect(result).toEqual({
        lead_id: 'existing-lead-123',
        user_id: 'existing-user-123',
        organization_id: 'existing-org-123',
        session_token: expect.stringContaining('lead_existing-lead-123_')
      });
    });

    it('should throw error for rate limit exceeded', async () => {
      const recentSubmissions = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }];

      // Mock rate limit exceeded
      mockSupabaseClient.single.mockResolvedValueOnce({ data: recentSubmissions, error: null });

      await expect(service.createLead(createLeadDto, mockIp)).rejects.toThrow(
        'Too many submissions. Please try again later.'
      );
    });

    it('should throw error for invalid email', async () => {
      const invalidDto = { ...createLeadDto, email: 'invalid-email' };

      await expect(service.createLead(invalidDto, mockIp)).rejects.toThrow();
    });
  });
});
