import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ReqUser } from '../auth/req-user.decorator';

@Controller('finance')
@UseGuards(AuthGuard, RolesGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  // Webhook Events
  @Get('webhooks')
  @Roles('admin', 'finance', 'auditor')
  async getWebhookEvents(
    @Query() filters: {
      provider?: string;
      status?: string;
      q?: string;
      date_from?: string;
      date_to?: string;
    },
  ) {
    try {
      const events = await this.financeService.getWebhookEvents(filters);
      return { data: events };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch webhook events', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('webhooks/:id')
  @Roles('admin', 'finance', 'auditor')
  async getWebhookEvent(
    @Param('id') id: string,
  ) {
    try {
      const event = await this.financeService.getWebhookEvent(id);
      return { data: event };
    } catch (error) {
      throw new HttpException(
        { error: 'Webhook event not found', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('webhook/replay')
  @Roles('admin', 'finance')
  async replayWebhookEvent(
    @Body() body: { id: string },
  ) {
    try {
      const result = await this.financeService.replayWebhookEvent(body.id);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to replay webhook event', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Invoices
  @Get('invoices')
  @Roles('admin', 'finance', 'auditor')
  async getInvoices(
    @Query() filters: {
      status?: string;
      q?: string;
      date_from?: string;
      date_to?: string;
    },
  ) {
    try {
      const invoices = await this.financeService.getInvoices(filters);
      return { data: invoices };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch invoices', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('invoices/:id/resend')
  @Roles('admin', 'finance')
  async resendInvoiceReceipt(
    @Param('id') invoiceId: string,
  ) {
    try {
      const result = await this.financeService.resendInvoiceReceipt(invoiceId);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to resend invoice receipt', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('invoices/:id/pdf')
  @Roles('admin', 'finance', 'auditor')
  async getInvoicePdf(
    @Param('id') invoiceId: string,
  ) {
    try {
      const result = await this.financeService.getInvoicePdf(invoiceId);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to get invoice PDF', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Refunds
  @Get('refunds')
  @Roles('admin', 'finance', 'auditor')
  async getRefunds(
    @Query() filters: {
      status?: string;
      q?: string;
    },
  ) {
    try {
      const refunds = await this.financeService.getRefunds(filters);
      return { data: refunds };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch refunds', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('refund')
  @Roles('admin', 'finance')
  async createRefund(
    @Body() refundData: {
      invoice_id?: string;
      order_id?: string;
      amount: number;
      reason: string;
      notify_customer: boolean;
    },
  ) {
    try {
      const refund = await this.financeService.createRefund(refundData);
      return { data: refund };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to create refund', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('refunds/:id/resend')
  @Roles('admin', 'finance')
  async resendRefundNotification(
    @Param('id') refundId: string,
  ) {
    try {
      const result = await this.financeService.resendRefundNotification(refundId);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to resend refund notification', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Finance Settings
  @Get('settings')
  @Roles('admin', 'finance', 'auditor')
  async getFinanceSettings() {
    try {
      const settings = await this.financeService.getFinanceSettings();
      return { data: settings };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to fetch finance settings', details: error.message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Put('settings')
  @Roles('admin', 'finance')
  async updateFinanceSettings(
    @Body() settings: any,
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.financeService.updateFinanceSettings(settings, user.userId);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to update finance settings', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('settings/reset')
  @Roles('admin')
  async resetFinanceSettings(
    @ReqUser() user: any,
  ) {
    try {
      const result = await this.financeService.resetFinanceSettings(user.userId);
      return { data: result };
    } catch (error) {
      throw new HttpException(
        { error: 'Failed to reset finance settings', details: error.message },
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
