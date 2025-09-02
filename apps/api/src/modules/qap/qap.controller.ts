import { Body, Controller, Get, Param, Post, Put, UseGuards, ValidationPipe } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { OrgGuard } from "../../auth/org.guard";
import { ReqUser } from "../../auth/req-user.decorator";
import { User } from "../../types/user";
import { QapService } from "./qap.service";
import { CreateQapTemplateDto, UpdateQapTemplateDto, GenerateQapDocumentDto } from "./qap.dto";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { QapTemplate, QapDocument, QapTemplateResponse, QapDocumentResponse } from "./qap.types";

@ApiTags("Quality Assurance Protocol")
@Controller("qap")
@UseGuards(AuthGuard("jwt"), OrgGuard)
export class QapController {
  constructor(private readonly qapService: QapService) {}

  @Post("templates")
  @ApiOperation({ summary: "Create a new QAP template" })
  @ApiResponse({ status: 201, description: "Template created successfully", type: QapTemplateResponse })
  async createTemplate(
    @Body(ValidationPipe) createQapTemplateDto: CreateQapTemplateDto,
    @ReqUser() user: User,
  ): Promise<QapTemplate> {
    return this.qapService.createTemplate({
      ...createQapTemplateDto,
      userId: user.id,
      orgId: user.org_id,
    });
  }

  @Put("templates/:id")
  @ApiOperation({ summary: "Update an existing QAP template" })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiResponse({ status: 200, description: "Template updated successfully", type: QapTemplateResponse })
  async updateTemplate(
    @Param("id") id: string,
    @Body(ValidationPipe) updateQapTemplateDto: UpdateQapTemplateDto,
    @ReqUser() user: User,
  ): Promise<QapTemplate> {
    return this.qapService.updateTemplate(id, {
      ...updateQapTemplateDto,
      userId: user.id,
    });
  }

  @Get("templates/:id")
  @ApiOperation({ summary: "Get a QAP template by ID" })
  @ApiParam({ name: "id", description: "Template ID" })
  @ApiResponse({ status: 200, description: "Template found", type: QapTemplateResponse })
  async getTemplate(@Param("id") id: string): Promise<QapTemplate> {
    return this.qapService.getTemplate(id);
  }

  @Get("templates/org/:orgId")
  @ApiOperation({ summary: "Get all QAP templates for an organization" })
  @ApiParam({ name: "orgId", description: "Organization ID" })
  @ApiResponse({ status: 200, description: "List of templates", type: [QapTemplateResponse] })
  async getTemplates(@Param("orgId") orgId: string): Promise<QapTemplate[]> {
    return this.qapService.getTemplates(orgId);
  }

  @Post("documents")
  @ApiOperation({ summary: "Generate a new QAP document" })
  @ApiResponse({ status: 201, description: "Document generation started", type: QapDocumentResponse })
  async generateQapDocument(
    @Body(ValidationPipe) generateQapDocumentDto: GenerateQapDocumentDto,
    @ReqUser() user: User,
  ): Promise<QapDocument> {
    return this.qapService.generateQapDocument({
      ...generateQapDocumentDto,
      userId: user.id,
      orgId: user.org_id,
    });
  }

  @Get("documents/:id")
  @ApiOperation({ summary: "Get a QAP document by ID" })
  @ApiParam({ name: "id", description: "Document ID" })
  @ApiResponse({ status: 200, description: "Document found", type: QapDocumentResponse })
  async getQapDocument(@Param("id") id: string): Promise<QapDocument> {
    return this.qapService.getQapDocument(id);
  }

  @Get("documents/order/:orderId")
  @ApiOperation({ summary: "Get all QAP documents for an order" })
  @ApiParam({ name: "orderId", description: "Order ID" })
  @ApiResponse({ status: 200, description: "List of documents", type: [QapDocumentResponse] })
  async getOrderQapDocuments(@Param("orderId") orderId: string): Promise<QapDocument[]> {
    return this.qapService.getOrderQapDocuments(orderId);
  }
}
