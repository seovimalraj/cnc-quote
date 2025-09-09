import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "../../lib/supabase/supabase.service";
// import { PdfService } from "../pdf/pdf.service";
import { Resend } from "resend";
import { CreateQuoteDto, UpdateQuoteDto } from "./quotes.dto";

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);
  private readonly resend: Resend;

  constructor(
    private readonly supabase: SupabaseService,
    // private readonly pdfService: PdfService,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);
  private readonly resend: Resend;

  constructor(
    private readonly supabase: SupabaseService,
    // private readonly pdfService: PdfService,
  ) {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  async createQuoteFromDfm(dfmRequestId: string) {
    this.logger.log(`Creating quote from DFM request: ${dfmRequestId}`);

    // Get DFM request with file info
    const { data: dfmRequest, error: dfmError } = await this.supabase.client
      .from('dfm_requests')
      .select(`
        *,
        file:files(*),
        organization:organizations(*),
        user:users(*)
      `)
      .eq('id', dfmRequestId)
      .single();

    if (dfmError || !dfmRequest) {
      this.logger.error(`DFM request not found: ${dfmRequestId}`, dfmError);
      throw new Error('DFM request not found');
    }

    if (!dfmRequest.file) {
      throw new Error('DFM request file not found');
    }

    // Map DFM specs to quote specs
    const quoteSpecs = await this.mapDfmToQuoteSpecs(dfmRequest);

    // Create quote
    const quoteData = {
      org_id: dfmRequest.organization_id,
      customer_id: dfmRequest.organization_id, // Use org as customer for now
      price_profile_id: dfmRequest.organization.price_profile_id || 'default',
      dfm_ruleset_id: dfmRequest.df_ruleset_id,
      total_amount: 0, // Will be calculated by pricing
      currency: 'USD',
      notes: `Created from DFM analysis: ${dfmRequest.file_name}`,
      items: [quoteSpecs]
    };

    const quote = await this.createQuote(quoteData);

    // Kick off background pricing
    this.kickOffPricing(quote.id, quoteSpecs);

    return {
      quote_id: quote.id,
      line_id: quote.items[0].id
    };
  }

  private async mapDfmToQuoteSpecs(dfmRequest: any) {
    // Map process type (assume CNC for now, can be extended)
    const processType = 'cnc';

    // Map material - if not specified, use best available
    let materialId = 'best_available';
    if (dfmRequest.material_id) {
      materialId = dfmRequest.material_id;
    }

    // Map finish IDs
    const finishIds = dfmRequest.finish_ids || [];

    // Map tolerance pack to tolerance
    const tolerance = dfmRequest.tolerance_pack || 'standard';

    // Map criticality to risk profile
    const riskProfile = this.mapCriticalityToRisk(dfmRequest.criticality);

    // Map certifications to inspection defaults
    const certifications = dfmRequest.certifications || [];

    return {
      file_id: dfmRequest.file_id,
      process_type: processType,
      material_id: materialId,
      finish_ids: finishIds,
      tolerance: tolerance,
      quantity: 1, // Default quantity
      unit_price: 0, // Will be calculated
      total_price: 0, // Will be calculated
      lead_time_days: 14, // Default lead time
      complexity_multiplier: 1.0,
      risk_profile: riskProfile,
      certifications: certifications,
      notes: dfmRequest.notes
    };
  }

  private mapCriticalityToRisk(criticality: string): string {
    switch (criticality?.toLowerCase()) {
      case 'low':
        return 'standard';
      case 'medium':
        return 'standard';
      case 'high':
        return 'premium';
      case 'critical':
        return 'premium';
      default:
        return 'standard';
    }
  }

  private async kickOffPricing(quoteId: string, quoteSpecs: any) {
    try {
      // Import pricing service dynamically to avoid circular dependencies
      const { PricingService } = await import('../pricing/pricing.service');

      // Create pricing request
      const pricingRequest = {
        quote_id: quoteId,
        line_id: quoteSpecs.id,
        process_type: quoteSpecs.process_type,
        material_id: quoteSpecs.material_id,
        finish_ids: quoteSpecs.finish_ids,
        tolerance: quoteSpecs.tolerance,
        quantity: quoteSpecs.quantity,
        certifications: quoteSpecs.certifications,
        risk_profile: quoteSpecs.risk_profile
      };

      // This would typically be sent to a queue for background processing
      this.logger.log(`Kicking off pricing for quote ${quoteId}`);

      // For now, we'll simulate the pricing call
      // In production, this should be queued
      setTimeout(async () => {
        try {
          // Update quote with pricing results
          await this.supabase.client
            .from('quote_items')
            .update({
              unit_price: 150.00, // Example price
              total_price: 150.00,
              lead_time_days: 14,
              updated_at: new Date().toISOString()
            })
            .eq('id', quoteSpecs.id);

          // Update quote total
          await this.supabase.client
            .from('quotes')
            .update({
              total_amount: 150.00,
              updated_at: new Date().toISOString()
            })
            .eq('id', quoteId);

          this.logger.log(`Pricing completed for quote ${quoteId}`);
        } catch (error) {
          this.logger.error(`Pricing failed for quote ${quoteId}`, error);
        }
      }, 2000); // Simulate 2 second processing time

    } catch (error) {
      this.logger.error(`Failed to kick off pricing for quote ${quoteId}`, error);
    }
  }

  async getQuote(id: string) {
    const { data: quote, error } = await this.supabase.client
      .from("quotes")
      .select(
        `
        *,
        items:quote_items(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error) throw error;
    return quote;
  }

  async updateQuote(id: string, data: UpdateQuoteDto) {
    const { data: quote, error } = await this.supabase.client
      .from("quotes")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return quote;
  }

  async generatePdf(_id: string): Promise<Buffer> {
    // PDF generation temporarily disabled
    throw new Error("PDF generation is temporarily disabled");
    // const quote = await this.getQuote(id);

    // Get org details
    // const { data: org } = await this.supabase.client.from("organizations").select("*").eq("id", quote.org_id).single();

    // Get customer details
    // const { data: customer } = await this.supabase.client
    //   .from("customers")
    //   .select("*")
    //   .eq("id", quote.customer_id)
    //   .single();

    // Format items
    // const items = await Promise.all(
    //   quote.items.map(async (item) => {
    //     const [{ data: material }, { data: file }] = await Promise.all([
    //       this.supabase.client.from("materials").select("*").eq("id", item.material_id).single(),
    //       this.supabase.client.from("files").select("*").eq("id", item.file_id).single(),
    //     ]);

    //     return {
    //       ...item,
    //       file_name: file.name,
    //       material: material.name,
    //       finishes: [], // TODO: Get finish names
    //     };
    //   }),
    // );

    // return this.pdfService.generateQuotePDF({
    //   id,
    //   org: {
    //     name: org.name,
    //     logo_url: org.logo_url,
    //     address: org.address,
    //   },
    //   customer: {
    //     name: customer.name,
    //     address: customer.address,
    //   },
    //   quote_number: `Q-${id.slice(0, 8)}`,
    //   created_at: quote.created_at,
    //   expires_at: quote.expires_at,
    //   total_amount: quote.total_amount,
    //   currency: quote.currency,
    //   items,
    // });
    //   terms: quote.terms,
    //   notes: quote.notes,
    // });
  }

  async sendQuote(id: string, email: string) {
    // const pdf = await this.generatePdf(id);
    const quote = await this.getQuote(id);

    // Generate secure accept link
    const acceptToken = await this.generateAcceptToken(id);
    const acceptUrl = `${process.env.APP_URL}/quotes/${id}/accept?token=${acceptToken}`;

    // Send email without PDF attachment (temporarily)
    return this.resend.emails.send({
      from: "CNC Quote <noreply@cncquote.com>",
      to: email,
      subject: `Quote #Q-${id.slice(0, 8)} - CNC Quote`,
      html: `
        <h2>Your CNC Quote is Ready</h2>
        <p>Quote Number: Q-${id.slice(0, 8)}</p>
        <p>Total Amount: ${quote.currency}${quote.total_amount}</p>
        <p><a href="${acceptUrl}">View and Accept Quote</a></p>
        <p>Note: PDF attachment is temporarily disabled.</p>
      `,
      // attachments: [
      //   {
      //     filename: `quote-${id}.pdf`,
      //     content: pdf,
      //   },
      // ],
    });
  }

  private async generateAcceptToken(quoteId: string): Promise<string> {
    // TODO: Implement secure token generation
    return Buffer.from(`${quoteId}-${Date.now()}`).toString("base64");
  }
}
