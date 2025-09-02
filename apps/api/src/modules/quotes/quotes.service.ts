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

  async createQuote(data: CreateQuoteDto) {
    const { data: quote, error } = await this.supabase.client
      .from("quotes")
      .insert({
        ...data,
        status: "draft",
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      })
      .select("*")
      .single();

    if (error) throw error;
    return quote;
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
