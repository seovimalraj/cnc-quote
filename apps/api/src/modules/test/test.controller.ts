import { Controller, Get, Param, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { ApiTags, ApiResponse } from "@nestjs/swagger";

@ApiTags("Test")
@Controller("api/test")
export class TestController {
  @Get("error/404/:id")
  @ApiResponse({ status: 404, description: "Resource not found error example" })
  testNotFound(@Param("id") id: string) {
    throw new NotFoundException(`Resource with ID ${id} not found`);
  }

  @Get("error/500")
  @ApiResponse({ status: 500, description: "Internal server error example" })
  testInternalError() {
    throw new InternalServerErrorException("Internal server error test");
  }
}
