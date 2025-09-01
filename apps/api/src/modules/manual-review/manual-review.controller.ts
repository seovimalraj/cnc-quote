import { Controller, Get, Post, Put, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { ManualReviewService } from "./manual-review.service";
import { ReqUser } from "../../auth/req-user.decorator";

@ApiTags("manual-review")
@Controller("manual-review")
export class ManualReviewController {
  constructor(private readonly manualReviewService: ManualReviewService) {}

  @Get("rules")
  async getRules(@ReqUser() user: any) {
    return this.manualReviewService.getRules(user.org_id);
  }

  @Post("rules")
  async createRule(@ReqUser() user: any, @Body() rule: any) {
    return this.manualReviewService.createRule(user.org_id, rule);
  }

  @Put("rules/:id")
  async updateRule(@ReqUser() user: any, @Param("id") id: string, @Body() updates: any) {
    return this.manualReviewService.updateRule(user.org_id, id, updates);
  }

  @Delete("rules/:id")
  async deleteRule(@ReqUser() user: any, @Param("id") id: string) {
    return this.manualReviewService.deleteRule(user.org_id, id);
  }

  @Get("tasks")
  async getTasks(@ReqUser() user: any, @Query() params: any) {
    return this.manualReviewService.getReviewTasks(user.org_id, params);
  }

  @Put("tasks/:id")
  async updateTask(@ReqUser() user: any, @Param("id") id: string, @Body() updates: any) {
    return this.manualReviewService.updateReviewTask(user.org_id, id, updates);
  }
}
