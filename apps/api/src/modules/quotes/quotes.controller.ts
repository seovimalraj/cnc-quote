import { Controller, Get, Post, Put, Body, Param, UseGuards, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { QuotesService } from "./quotes.service";
import { CreateQuoteDto, UpdateQuoteDto } from "./quotes.dto";

@Controller("api/quotes")
@UseGuards(JwtAuthGuard, OrgGuard)
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post("from-dfm")
  async createQuoteFromDfm(@Body() data: { dfm_request_id: string }) {
    return this.quotesService.createQuoteFromDfm(data.dfm_request_id);
  }

  @Get(":id")
  async getQuote(@Param("id") id: string) {
    return this.quotesService.getQuote(id);
  }

  @Put(":id")
  async updateQuote(@Param("id") id: string, @Body() data: UpdateQuoteDto) {
    return this.quotesService.updateQuote(id, data);
  }

  @Get(":id/pdf")
  async downloadPdf(@Param("id") id: string, @Res() res: Response) {
    const pdf = await this.quotesService.generatePdf(id);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="quote-${id}.pdf"`,
    });

    res.send(pdf);
  }

  @Post(":id/send")
  async sendQuote(@Param("id") id: string, @Body("email") email: string) {
    await this.quotesService.sendQuote(id, email);
    return { success: true };
  }

  @Get(":id/accept")
  async acceptQuote(@Param("id") id: string, @Query("token") _token: string) {
    // TODO: Validate token
    await this.quotesService.updateQuote(id, {
      status: "accepted",
      acceptedAt: new Date(),
    });
    return { success: true };
  }

  @Get(":id/reject")
  async rejectQuote(@Param("id") id: string, @Query("token") _token: string) {
    // TODO: Validate token
    await this.quotesService.updateQuote(id, {
      status: "rejected",
      rejectedAt: new Date(),
    });
    return { success: true };
  }
}
