import { Body, Controller, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { OrgGuard } from "../../auth/org.guard";
import { ReqUser } from "../../auth/req-user.decorator";
import { QapService } from "./qap.service";

@Controller("qap")
@UseGuards(AuthGuard("jwt"), OrgGuard)
export class QapController {
  constructor(private readonly qapService: QapService) {}

  @Post("templates")
  async createTemplate(
    @Body()
    data: {
      orgId: string;
      name: string;
      description?: string;
      templateHtml: string;
      schemaJson: any;
      processType: string;
    },
    @ReqUser() user: any,
  ) {
    return this.qapService.createTemplate({
      ...data,
      userId: user.id,
    });
  }

  @Put("templates/:id")
  async updateTemplate(
    @Param("id") id: string,
    @Body()
    data: {
      name?: string;
      description?: string;
      templateHtml?: string;
      schemaJson?: any;
      processType?: string;
    },
    @ReqUser() user: any,
  ) {
    return this.qapService.updateTemplate(id, {
      ...data,
      userId: user.id,
    });
  }

  @Get("templates/:id")
  async getTemplate(@Param("id") id: string) {
    return this.qapService.getTemplate(id);
  }

  @Get("templates/org/:orgId")
  async getTemplates(@Param("orgId") orgId: string) {
    return this.qapService.getTemplates(orgId);
  }

  @Post("documents")
  async generateQapDocument(
    @Body()
    data: {
      templateId: string;
      orderId: string;
      orderItemId: string;
      orgId: string;
      documentData: any;
    },
    @ReqUser() user: any,
  ) {
    return this.qapService.generateQapDocument({
      ...data,
      userId: user.id,
    });
  }

  @Get("documents/:id")
  async getQapDocument(@Param("id") id: string) {
    return this.qapService.getQapDocument(id);
  }

  @Get("documents/order/:orderId")
  async getOrderQapDocuments(@Param("orderId") orderId: string) {
    return this.qapService.getOrderQapDocuments(orderId);
  }
}
