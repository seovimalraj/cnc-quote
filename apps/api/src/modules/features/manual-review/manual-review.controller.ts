import { Controller, Get, Post, Put, Delete, Body, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ManualReviewService } from "./manual-review.service";
import { ReqUser } from "../../core/auth/req-user.decorator";
import {
  ManualReviewRule,
  CreateRuleDto,
  UpdateRuleDto,
  ReviewTask,
  GetTasksParams,
  UpdateTaskDto,
} from "./manual-review.types";
import { User } from "../../types/user";

@ApiTags("manual-review")
@Controller("manual-review")
export class ManualReviewController {
  constructor(private readonly manualReviewService: ManualReviewService) {}

  @Get("rules")
  @ApiOperation({ summary: "Get all manual review rules for organization" })
  @ApiResponse({ status: 200, type: [ManualReviewRule] })
  async getRules(@ReqUser() user: User): Promise<ManualReviewRule[]> {
    return this.manualReviewService.getRules(user.org_id);
  }

  @Post("rules")
  @ApiOperation({ summary: "Create a new manual review rule" })
  @ApiResponse({ status: 201, type: ManualReviewRule })
  async createRule(@ReqUser() user: User, @Body() rule: CreateRuleDto): Promise<ManualReviewRule> {
    return this.manualReviewService.createRule(user.org_id, rule);
  }

  @Put("rules/:id")
  @ApiOperation({ summary: "Update a manual review rule" })
  @ApiResponse({ status: 200, type: ManualReviewRule })
  async updateRule(
    @ReqUser() user: User,
    @Param("id") id: string,
    @Body() updates: UpdateRuleDto,
  ): Promise<ManualReviewRule> {
    return this.manualReviewService.updateRule(user.org_id, id, updates);
  }

  @Delete("rules/:id")
  @ApiOperation({ summary: "Delete a manual review rule" })
  @ApiResponse({ status: 200 })
  async deleteRule(@ReqUser() user: User, @Param("id") id: string): Promise<boolean> {
    return this.manualReviewService.deleteRule(user.org_id, id);
  }

  @Get("tasks")
  @ApiOperation({ summary: "Get manual review tasks" })
  @ApiResponse({ status: 200, type: [ReviewTask] })
  async getTasks(@ReqUser() user: User, @Query() params: GetTasksParams): Promise<ReviewTask[]> {
    return this.manualReviewService.getReviewTasks(user.org_id, params);
  }

  @Put("tasks/:id")
  @ApiOperation({ summary: "Update a manual review task" })
  @ApiResponse({ status: 200, type: ReviewTask })
  async updateTask(
    @ReqUser() user: User,
    @Param("id") id: string,
    @Body() updates: UpdateTaskDto,
  ): Promise<ReviewTask> {
    return this.manualReviewService.updateReviewTask(user.org_id, id, updates);
  }
}
