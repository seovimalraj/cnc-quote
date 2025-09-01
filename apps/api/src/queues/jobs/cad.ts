import { Process, Processor } from "@nestjs/bull";
import { Job } from "bullmq";

@Processor("cad")
export class CadProcessor {
  @Process("analyze")
  async analyze(_job: Job) {
    // TODO: Implement CAD analysis
    return { status: "processed" };
  }
}
