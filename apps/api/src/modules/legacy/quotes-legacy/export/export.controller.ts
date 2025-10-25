/**
 * Step 14: Export Controller
 * CSV/JSON export for margins and outcomes
 */

import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  StreamableFile,
  Header,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { MarginsService } from "../margins/margins.service";
import { JwtAuthGuard } from "../../auth/jwt.guard";
import { OrgGuard } from "../../auth/org.guard";
import { RbacGuard } from "../../auth/rbac.middleware";

@ApiTags('Quote Export')
@ApiBearerAuth()
@Controller('quotes/export')
@UseGuards(JwtAuthGuard, OrgGuard)
export class ExportController {
  constructor(private readonly marginsService: MarginsService) {}

  /**
   * Export margins as CSV
   */
  @Get('margins.csv')
  @UseGuards(RbacGuard('quotes:read', 'quote'))
  @ApiOperation({ summary: 'Export quote margins as CSV' })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'customer_id', required: false, type: String })
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="quote-margins.csv"')
  async exportMarginsCSV(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('status') status?: string,
    @Query('customer_id') customerId?: string,
    @Request() req?: any,
    @Res() res?: Response,
  ) {
    const quotes = await this.marginsService.getMarginsBatch(req.user.org_id, {
      dateFrom,
      dateTo,
      status,
      customerId,
    });

    // Build CSV
    const headers = [
      'Quote ID',
      'Created At',
      'Customer',
      'Status',
      'Total Price',
      'Gross Margin $',
      'Gross Margin %',
      'Outcome Status',
      'Outcome Reason',
      'Line ID',
      'Process',
      'Material',
      'Quantity',
      'Unit Price',
      'Line Total',
      'Line Margin $',
      'Line Margin %',
      'Setup Cost',
      'Machine Cost',
      'Material Cost',
      'Finish Cost',
      'Risk Markup',
      'Tolerance Cost',
      'Overhead',
    ];

    let csv = headers.join(',') + '\n';

    for (const quote of quotes) {
      const outcomeStatus = quote.quote_outcomes?.[0]?.status || '';
      const outcomeReason = quote.quote_outcomes?.[0]?.reason_code || '';

      // Each line as a row
      for (const line of quote.quote_lines || []) {
        const breakdown = line.line_cost_breakdown || {};
        const row = [
          quote.id,
          quote.created_at,
          `"${quote.customer_name || ''}"`,
          quote.status,
          quote.total_price?.toFixed(2) || '0.00',
          quote.gross_margin_amount?.toFixed(2) || '0.00',
          quote.gross_margin_pct?.toFixed(4) || '0.0000',
          outcomeStatus,
          outcomeReason,
          line.id,
          `"${line.process || ''}"`,
          `"${line.material || ''}"`,
          line.quantity,
          line.unit_price?.toFixed(2) || '0.00',
          line.total_price?.toFixed(2) || '0.00',
          line.margin_amount?.toFixed(2) || '0.00',
          line.margin_pct?.toFixed(4) || '0.0000',
          breakdown.setup_time_cost?.toFixed(2) || '0.00',
          breakdown.machine_time_cost?.toFixed(2) || '0.00',
          breakdown.material_cost?.toFixed(2) || '0.00',
          breakdown.finish_cost?.toFixed(2) || '0.00',
          breakdown.risk_markup?.toFixed(2) || '0.00',
          breakdown.tolerance_multiplier_cost?.toFixed(2) || '0.00',
          breakdown.overhead_cost?.toFixed(2) || '0.00',
        ];
        csv += row.join(',') + '\n';
      }
    }

    res.send(csv);
  }

  /**
   * Export margins as JSON
   */
  @Get('margins.json')
  @UseGuards(RbacGuard('quotes:read', 'quote'))
  @ApiOperation({ summary: 'Export quote margins as JSON' })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'customer_id', required: false, type: String })
  async exportMarginsJSON(
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('status') status?: string,
    @Query('customer_id') customerId?: string,
    @Request() req?: any,
  ) {
    const quotes = await this.marginsService.getMarginsBatch(req.user.org_id, {
      dateFrom,
      dateTo,
      status,
      customerId,
    });

    return {
      exported_at: new Date().toISOString(),
      record_count: quotes.length,
      filters: { dateFrom, dateTo, status, customerId },
      data: quotes,
    };
  }
}
