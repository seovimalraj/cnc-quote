import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { AuthGuard } from '@nestjs/passport';
import { OrgGuard } from '../auth/org.guard';
import { ReqUser } from '../auth/req-user.decorator';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // QAP Document Endpoints
  @Post('qap')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async generateQapDocument(
    @Body() body: { orderId: string; templateId: string },
    @ReqUser() user: { id: string; org_id: string },
  ) {
    return this.documentsService.generateQapDocument(
      body.orderId,
      body.templateId,
      user.id,
      user.org_id,
    );
  }

  @Post('qap/:id/regenerate')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async regenerateQapDocument(
    @Param('id') qapId: string,
    @ReqUser() user: { id: string },
  ) {
    return this.documentsService.regenerateQapDocument(qapId, user.id);
  }

  @Get('qap')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async getQapDocuments(
    @ReqUser() user: { org_id: string },
    @Query() filters: any,
  ) {
    return this.documentsService.getQapDocuments(user.org_id, filters);
  }

  // Certificate Endpoints
  @Get('certificates')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async getCertificates(
    @ReqUser() user: { org_id: string },
    @Query() filters: any,
  ) {
    return this.documentsService.getCertificates(user.org_id, filters);
  }

  @Put('certificates/:id/verify')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async verifyCertificate(
    @Param('id') certId: string,
    @ReqUser() user: { id: string },
  ) {
    return this.documentsService.verifyCertificate(certId, user.id);
  }

  @Put('certificates/:id/link')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async linkCertificateToOrder(
    @Param('id') certId: string,
    @Body() body: { orderId: string; orderLineId?: string },
  ) {
    return this.documentsService.linkCertificateToOrder(
      certId,
      body.orderId,
      body.orderLineId,
    );
  }

  // FAIR Report Endpoints
  @Get('fair')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async getFairReports(
    @ReqUser() user: { org_id: string },
    @Query() filters: any,
  ) {
    return this.documentsService.getFairReports(user.org_id, filters);
  }

  @Put('fair/:id/review')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async reviewFairReport(
    @Param('id') fairId: string,
    @Body() body: { notes: string },
    @ReqUser() user: { id: string },
  ) {
    return this.documentsService.reviewFairReport(fairId, body.notes, user.id);
  }

  // Invoice Endpoints
  @Get('invoices')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async getInvoices(
    @ReqUser() user: { org_id: string },
    @Query() filters: any,
  ) {
    return this.documentsService.getInvoices(user.org_id, filters);
  }

  @Post('invoices/:id/refund')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async refundInvoice(
    @Param('id') invoiceId: string,
    @ReqUser() user: { id: string },
  ) {
    return this.documentsService.refundInvoice(invoiceId, user.id);
  }

  // File Endpoints
  @Get('files')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async getFiles(
    @ReqUser() user: { org_id: string },
    @Query() filters: any,
  ) {
    return this.documentsService.getFiles(user.org_id, filters);
  }

  @Put('files/:id/link')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async linkFileToObject(
    @Param('id') fileId: string,
    @Body() body: { type: string; objectId: string; tags?: string[] },
  ) {
    return this.documentsService.linkFileToObject(
      fileId,
      body.type,
      body.objectId,
      body.tags,
    );
  }

  @Delete('files/:id/link')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async unlinkFileFromObject(
    @Param('id') fileId: string,
    @Body() body: { type: string; objectId: string },
  ) {
    return this.documentsService.unlinkFileFromObject(
      fileId,
      body.type,
      body.objectId,
    );
  }

  @Delete('files/:id')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async deleteFile(
    @Req() req: any,
    @Param('id') fileId: string,
    @ReqUser() user: { id: string },
  ) {
    req.audit = {
      action: 'FILE_DELETED',
      resourceType: 'file',
      resourceId: fileId,
      before: null,
    };
    const result = await this.documentsService.deleteFile(fileId, user.id);
    req.audit.after = { status: 'deleted' };
    return result;
  }

  // Bulk Operations
  @Post('files/bulk-download')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async bulkDownload(
    @Body() body: { files: string[] },
    @ReqUser() user: { id: string },
  ) {
    return this.documentsService.bulkDownload(body.files, user.id);
  }

  @Post('files/bulk-delete')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async bulkDelete(
    @Req() req: any,
    @Body() body: { files: string[] },
    @ReqUser() user: { id: string },
  ) {
    req.audit = {
      action: 'FILE_DELETED',
      resourceType: 'file',
      resourceId: undefined,
      before: { files: body.files },
    };
    const result = await this.documentsService.bulkDelete(body.files, user.id);
    req.audit.after = { deleted: body.files.length };
    return result;
  }

  @Post('files/bulk-tag')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async bulkTag(
    @Body() body: { files: string[]; tags: string[] },
    @ReqUser() user: { id: string },
  ) {
    return this.documentsService.bulkTag(body.files, body.tags, user.id);
  }

  // Export Endpoints
  @Get('export')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async exportDocuments(
    @ReqUser() user: { org_id: string },
    @Query() filters: any,
  ) {
    return this.documentsService.exportDocuments(user.org_id, filters);
  }

  @Get('invoices/export')
  @UseGuards(AuthGuard('jwt'), OrgGuard)
  async exportInvoices(
    @ReqUser() user: { org_id: string },
    @Query() filters: any,
  ) {
    return this.documentsService.exportInvoices(user.org_id, filters);
  }
}
