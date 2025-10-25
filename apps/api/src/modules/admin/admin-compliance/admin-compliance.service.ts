import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from "../../../lib/supabase/supabase.service";
import { CacheService } from "../../../lib/cache/cache.service";

export interface ComplianceSettings {
  itar_enabled: boolean;
  ear_enabled: boolean;
  restricted_countries: string[];
  compliance_officer_email: string;
  auto_block_suspicious: boolean;
  data_retention_days: number;
  audit_retention_days: number;
  export_control_review_required: boolean;
  compliance_training_required: boolean;
  last_updated: string;
  updated_by: string;
}

export interface ExportControlReview {
  id: string;
  quote_id: string;
  user_id: string;
  destination_country: string;
  product_category: string;
  export_control_classification: string;
  review_status: 'pending' | 'approved' | 'rejected' | 'escalated';
  reviewed_by: string;
  reviewed_at: string;
  notes: string;
  created_at: string;
}

export interface ComplianceViolation {
  id: string;
  user_id: string;
  violation_type: 'export_control' | 'data_access' | 'policy_breach';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detected_at: string;
  resolved_at?: string;
  resolution_notes?: string;
  created_at: string;
}

export interface ComplianceReport {
  total_violations: number;
  unresolved_violations: number;
  export_reviews_pending: number;
  export_reviews_approved: number;
  export_reviews_rejected: number;
  compliance_score: number;
  last_audit_date: string;
  next_audit_date: string;
}

@Injectable()
export class AdminComplianceService {
  private readonly logger = new Logger(AdminComplianceService.name);

  // ITAR/EAR restricted countries (simplified list)
  private readonly restrictedCountries = [
    'AF', 'BY', 'CU', 'IR', 'IQ', 'KP', 'LY', 'SD', 'SY', 'VE', 'ZW'
  ];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
  ) {}

  async getComplianceSettings(): Promise<ComplianceSettings> {
    try {
      const { data, error } = await this.supabase.client
        .from('compliance_settings')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        this.logger.error('Failed to get compliance settings', error);
        throw new BadRequestException('Failed to get compliance settings');
      }

      // Return defaults if no settings exist
      if (!data) {
        return {
          itar_enabled: false,
          ear_enabled: false,
          restricted_countries: this.restrictedCountries,
          compliance_officer_email: '',
          auto_block_suspicious: true,
          data_retention_days: 2555, // 7 years
          audit_retention_days: 2555,
          export_control_review_required: false,
          compliance_training_required: false,
          last_updated: new Date().toISOString(),
          updated_by: 'system',
        };
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to get compliance settings', error);
      throw error;
    }
  }

  async updateComplianceSettings(settings: Partial<ComplianceSettings>, updatedBy: string): Promise<ComplianceSettings> {
    try {
      const updatedSettings = {
        ...settings,
        last_updated: new Date().toISOString(),
        updated_by: updatedBy,
      };

      const { data, error } = await this.supabase.client
        .from('compliance_settings')
        .upsert(updatedSettings)
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to update compliance settings', error);
        throw new BadRequestException('Failed to update compliance settings');
      }

      // Clear cache
      await this.cache.del('compliance_settings');

      return data;
    } catch (error) {
      this.logger.error('Failed to update compliance settings', error);
      throw error;
    }
  }

  async getExportControlReviews(filters?: {
    status?: string;
    country?: string;
    reviewer?: string;
  }): Promise<ExportControlReview[]> {
    try {
      let query = this.supabase.client
        .from('export_control_reviews')
        .select(`
          *,
          users!export_control_reviews_user_id_fkey(name, email),
          quotes!export_control_reviews_quote_id_fkey(id, status)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        query = query.eq('review_status', filters.status);
      }

      if (filters?.country) {
        query = query.eq('destination_country', filters.country);
      }

      if (filters?.reviewer) {
        query = query.eq('reviewed_by', filters.reviewer);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        this.logger.error('Failed to get export control reviews', error);
        return [];
      }

      return data?.map(row => ({
        id: row.id,
        quote_id: row.quote_id,
        user_id: row.user_id,
        destination_country: row.destination_country,
        product_category: row.product_category,
        export_control_classification: row.export_control_classification,
        review_status: row.review_status,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
        notes: row.notes,
        created_at: row.created_at,
      })) || [];
    } catch (error) {
      this.logger.error('Failed to get export control reviews', error);
      return [];
    }
  }

  async submitExportControlReview(review: {
    quote_id: string;
    user_id: string;
    destination_country: string;
    product_category: string;
    export_control_classification: string;
  }): Promise<ExportControlReview> {
    try {
      const { data, error } = await this.supabase.client
        .from('export_control_reviews')
        .insert({
          ...review,
          review_status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        this.logger.error('Failed to submit export control review', error);
        throw new BadRequestException('Failed to submit export control review');
      }

      return data;
    } catch (error) {
      this.logger.error('Failed to submit export control review', error);
      throw error;
    }
  }

  async reviewExportControl(reviewId: string, status: 'approved' | 'rejected' | 'escalated', reviewerId: string, notes?: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('export_control_reviews')
        .update({
          review_status: status,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          notes: notes || '',
        })
        .eq('id', reviewId);

      if (error) {
        this.logger.error('Failed to review export control', error);
        throw new BadRequestException('Failed to review export control');
      }
    } catch (error) {
      this.logger.error('Failed to review export control', error);
      throw error;
    }
  }

  async getComplianceViolations(filters?: {
    resolved?: boolean;
    severity?: string;
    type?: string;
  }): Promise<ComplianceViolation[]> {
    try {
      let query = this.supabase.client
        .from('compliance_violations')
        .select(`
          *,
          users!compliance_violations_user_id_fkey(name, email)
        `)
        .order('detected_at', { ascending: false });

      if (filters?.resolved !== undefined) {
        if (filters.resolved) {
          query = query.not('resolved_at', 'is', null);
        } else {
          query = query.is('resolved_at', null);
        }
      }

      if (filters?.severity) {
        query = query.eq('severity', filters.severity);
      }

      if (filters?.type) {
        query = query.eq('violation_type', filters.type);
      }

      const { data, error } = await query.limit(100);

      if (error) {
        this.logger.error('Failed to get compliance violations', error);
        return [];
      }

      return data || [];
    } catch (error) {
      this.logger.error('Failed to get compliance violations', error);
      return [];
    }
  }

  async resolveViolation(violationId: string, resolutionNotes: string, resolvedBy: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('compliance_violations')
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq('id', violationId);

      if (error) {
        this.logger.error('Failed to resolve violation', error);
        throw new BadRequestException('Failed to resolve violation');
      }
    } catch (error) {
      this.logger.error('Failed to resolve violation', error);
      throw error;
    }
  }

  async getComplianceReport(): Promise<ComplianceReport> {
    try {
      // Get violation counts
      const { data: violations, error: violationsError } = await this.supabase.client
        .from('compliance_violations')
        .select('resolved_at, severity');

      if (violationsError) {
        this.logger.error('Failed to get violations for report', violationsError);
      }

      const totalViolations = violations?.length || 0;
      const unresolvedViolations = violations?.filter(v => !v.resolved_at).length || 0;

      // Get export review stats
      const { data: reviews, error: reviewsError } = await this.supabase.client
        .from('export_control_reviews')
        .select('review_status');

      if (reviewsError) {
        this.logger.error('Failed to get reviews for report', reviewsError);
      }

      const exportReviewsPending = reviews?.filter(r => r.review_status === 'pending').length || 0;
      const exportReviewsApproved = reviews?.filter(r => r.review_status === 'approved').length || 0;
      const exportReviewsRejected = reviews?.filter(r => r.review_status === 'rejected').length || 0;

      // Calculate compliance score (simplified)
      const complianceScore = Math.max(0, 100 - (unresolvedViolations * 5) - (exportReviewsPending * 2));

      return {
        total_violations: totalViolations,
        unresolved_violations: unresolvedViolations,
        export_reviews_pending: exportReviewsPending,
        export_reviews_approved: exportReviewsApproved,
        export_reviews_rejected: exportReviewsRejected,
        compliance_score: complianceScore,
        last_audit_date: new Date().toISOString(), // Would track actual audit dates
        next_audit_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      };
    } catch (error) {
      this.logger.error('Failed to get compliance report', error);
      throw error;
    }
  }

  async checkCountryRestriction(countryCode: string): Promise<boolean> {
    const settings = await this.getComplianceSettings();
    return settings.restricted_countries.includes(countryCode.toUpperCase());
  }

  async logComplianceEvent(event: {
    user_id: string;
    event_type: string;
    description: string;
    ip_address?: string;
    user_agent?: string;
  }): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('compliance_events')
        .insert({
          ...event,
          created_at: new Date().toISOString(),
        });

      if (error) {
        this.logger.error('Failed to log compliance event', error);
      }
    } catch (error) {
      this.logger.error('Failed to log compliance event', error);
    }
  }
}
