import "reflect-metadata";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TestService {
  test() {
    return "test";
  }
}
